import React, { useEffect, useState, useRef, useCallback } from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDiscordSDK } from './hooks/useDiscordSDK';
import { useGameStore } from './store/gameStore';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { PlayerHand } from './components/PlayerHand';
import { PlayerList } from './components/PlayerList';
import { GameControls } from './components/GameControls';
import { GamePhase, Player, Tile, TileOnBoard } from './types/game';
import { useSocket } from './hooks/useSocket';
import { WinnerScreen } from './components/WinnerScreen';

function App() {
  const { user, participants, isReady, error, channelId } = useDiscordSDK();
  const { onGameStateUpdate, onGameReset } = useSocket(channelId);
  const [winner, setWinner] = useState<Player | null>(null);

  const {
    phase,
    players,
    currentPlayerIndex,
    board,
    pool,
    myHand,
    myPlayerId,
    turnTimeRemaining,
    canDraw,
    canUndo,
    canEndTurn,
    setMyPlayerId,
    initializeGame,
    fetchMyHand,
    startGame,
    drawTile,
    placeTile,
    moveTile,
    endTurn,
    undoTurn,
    undoLastAction,
    resetGame,
    addPlayer,
    toggleReady,
    syncGameState,
  } = useGameStore();

  // interface DiscordUser {
  //   id: string;
  //   username: string;
  //   discriminator: string;
  //   avatar?: string;
  // }

  // const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [drawnTileId, setDrawnTileId] = useState<string | null>(null);
  const isSyncing = useRef(false);
  const isHandlingTimeout = useRef(false);
  const turnStartTime = useRef<number>(0); // When we received the turn start message
  const lastTurnEndTime = useRef<number>(0); // Track last turnEndTime to detect changes
  const lastPlacedSetId = useRef<string | null>(null); // Track the last placed meld for auto-relocation

  // useEffect(() => {
  //   // Grab the Discord proxy ticket from the URL
  //   const urlParams = new URLSearchParams(window.location.search);
  //   const ticket = urlParams.get('discord_proxy_ticket');

  //   if (ticket) {
  //     // Send it to your backend for validation
  //     fetch(`https://rummy-server-4m92.onrender.com/auth/discord?discord_proxy_ticket=${ticket}`, {
  //       credentials: 'include', // Important if your backend sets cookies/sessions
  //     })
  //       .then(res => res.json())
  //       .then(data => {
  //         console.log('Discord user session:', data.user);
  //         setDiscordUser(data.user); // Store user info in state
  //       })
  //       .catch(err => console.error('Error validating Discord ticket:', err));
  //   } else {
  //     console.warn('No Discord proxy ticket found in URL');
  //   }
  // }, []); // Empty dependency array → runs once when the app loads

  // Initialize game when Discord SDK is ready
  useEffect(() => {
    if (isReady && user && channelId && !hasInitialized) {
      setMyPlayerId(user.id);

      // Convert Discord participants to game players
      const gamePlayers: Player[] = participants.map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        tilesCount: 0,
        hasPlayedInitial: false,
        isReady: false,
      }));

      // Add current user if not in participants
      if (!gamePlayers.find(p => p.id === user.id)) {
        gamePlayers.push({
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          tilesCount: 0,
          hasPlayedInitial: false,
          isReady: false,
        });
      }

      gamePlayers.forEach(player => addPlayer(player));

      // ALL players try to initialize (server will handle if already exists)
      if (gamePlayers.length >= 2) {
        console.log('🎮 Initializing/joining game on server');
        initializeGame(channelId, gamePlayers);
      }

      setHasInitialized(true);
    }
  }, [isReady, user, channelId, participants, hasInitialized, setMyPlayerId, addPlayer, initializeGame]);

  // Fetch player's hand after game is initialized
  useEffect(() => {
    if (hasInitialized && channelId && myPlayerId && myHand.tiles.length === 0 && phase === GamePhase.PLAYING) {
      console.log('🎴 Fetching my hand from server');
      fetchMyHand(channelId, myPlayerId);
    }
  }, [hasInitialized, channelId, myPlayerId, myHand.tiles.length, phase, fetchMyHand]);

  // Listen for new participants joining
  useEffect(() => {
    if (isReady && hasInitialized && participants.length > 0) {
      participants.forEach(participant => {
        const existingPlayer = players.find(p => p.id === participant.id);
        if (!existingPlayer) {
          console.log('New player joined:', participant.username);
          addPlayer({
            id: participant.id,
            username: participant.username,
            avatar: participant.avatar,
            tilesCount: 0,
            hasPlayedInitial: false,
            isReady: false,
          });
        }
      });
    }
  }, [participants, players, addPlayer, isReady, hasInitialized]);

  // Listen for server game state updates
  useEffect(() => {
    const cleanup = onGameStateUpdate((gameState) => {
      console.log('📥 Received server update:', gameState);
      isSyncing.current = true;

      // Track when we receive a new turn (turnEndTime changed)
      if (gameState.turnEndTime && gameState.turnEndTime !== lastTurnEndTime.current) {
        turnStartTime.current = Date.now();
        lastTurnEndTime.current = gameState.turnEndTime;
        console.log(`⏱️  New turn detected! Timer duration: ${gameState.turnTimerDuration}s, Started at: ${new Date(turnStartTime.current).toISOString()}`);
      }

      // Check for winner
      if (gameState.phase === 'ended' && gameState.winner) {
        setWinner(gameState.winner);
      }

      syncGameState(gameState);

      // After syncing state, check if we need to relocate the last placed meld
      if (lastPlacedSetId.current && channelId && gameState.board) {
        const setIdToCheck = lastPlacedSetId.current;
        lastPlacedSetId.current = null; // Clear it immediately

        setTimeout(async () => {
          // Use the NEW board state from gameState, not the old one from closure
          const updatedBoard = gameState.board || [];
          const meldTiles = updatedBoard.filter((t: TileOnBoard) => t.setId === setIdToCheck);
          if (meldTiles.length === 0) return; // Meld doesn't exist yet or was moved

          const sortedTiles = [...meldTiles].sort((a, b) => a.position.x - b.position.x);
          const firstTile = sortedTiles[0];
          const lastTile = sortedTiles[sortedTiles.length - 1];
          const y = firstTile.position.y;

          // Check if there's a tile immediately adjacent from a different meld
          const leftTile = updatedBoard.find((t: TileOnBoard) =>
            t.position.x === firstTile.position.x - 1 &&
            t.position.y === y &&
            t.setId !== setIdToCheck
          );
          const rightTile = updatedBoard.find((t: TileOnBoard) =>
            t.position.x === lastTile.position.x + 1 &&
            t.position.y === y &&
            t.setId !== setIdToCheck
          );

          const hasSpace = !leftTile && !rightTile;
          console.log(`🔍 Meld ${setIdToCheck} has space: ${hasSpace} (left: ${!leftTile}, right: ${!rightTile})`);

          if (!hasSpace) {
            console.log('⚠️ Meld is touching another meld, relocating...');
            const newLocation = findEmptySpaceForMeld(meldTiles.length);

            if (newLocation) {
              console.log(`✨ Relocating meld to new position (${newLocation.x}, ${newLocation.y})`);
              await relocateMeld(meldTiles, newLocation);
            } else {
              console.warn('⚠️ No empty space found for meld relocation');
            }
          }
        }, 100);
      }

      setTimeout(() => {
        isSyncing.current = false;
      }, 500);
    });

    return cleanup;
  }, [onGameStateUpdate, syncGameState, board, channelId]);

  // Listen for game reset events
  useEffect(() => {
    console.log('🎧 Setting up game-reset listener...');
    const cleanup = onGameReset((newGameState: any) => {
      console.log('🔄 Game reset event received from server!', newGameState);

      // Reset the game state to lobby
      useGameStore.setState({
        id: channelId || '',
        phase: GamePhase.LOBBY,
        players: newGameState.players || [],
        currentPlayerIndex: 0,
        board: [],
        pool: [], // Pool is not sent to client for security, just track size
        turnStartBoard: [],
        myHand: { tiles: [] },
        canDraw: false,
        canUndo: false,
        canEndTurn: false,
        turnEndTime: 0,
        turnTimerDuration: 60,
        turnTimeRemaining: 0,
      });

      console.log('✅ Game reset to lobby - ready for new game!');
    });

    return () => {
      console.log('🎧 Cleaning up game-reset listener');
      cleanup();
    };
  }, [onGameReset, channelId]);

  const isMyTurn = myPlayerId && players[currentPlayerIndex]?.id === myPlayerId;

  // Clear drawn tile visual cue when turn changes
  useEffect(() => {
    setDrawnTileId(null);
  }, [currentPlayerIndex]);

  // Handle timer expiration
  const handleTimeExpired = useCallback(async () => {
    if (!channelId || !myPlayerId) return;

    // Prevent multiple simultaneous timeout handlers
    if (isHandlingTimeout.current) {
      console.log('⏰ Already handling timeout, skipping...');
      return;
    }

    isHandlingTimeout.current = true;
    console.log('⏰ Time expired - undoing turn and ending');

    // Undo the turn first (return tiles to hand)
    await undoTurn(channelId, myPlayerId);

    // Then automatically draw a tile (which auto-ends turn)
    try {
      await drawTile(channelId, myPlayerId);
    } catch (error) {
      console.error('Failed to auto-draw on timeout:', error);
      // If can't draw (pool empty), just end turn
      try {
        await endTurn(channelId, myPlayerId);
      } catch (e) {
        console.error('Failed to end turn:', e);
      }
    }

    // Reset the flag after a delay to allow state to update
    setTimeout(() => {
      isHandlingTimeout.current = false;
    }, 1000);
  }, [channelId, myPlayerId, undoTurn, drawTile, endTurn]);

  // Turn timer countdown - now global for all players
  useEffect(() => {
    if (phase !== GamePhase.PLAYING) return;

    const timer = setInterval(() => {
      const state = useGameStore.getState();
      const { turnTimerDuration } = state;

      // Calculate elapsed time since turn started (based on message receive time)
      const now = Date.now();
      const elapsedMs = now - turnStartTime.current;
      const elapsedSec = Math.floor(elapsedMs / 1000);

      // Remaining = duration - elapsed
      const remainingSec = Math.max(0, turnTimerDuration - elapsedSec);

      useGameStore.setState({
        turnTimeRemaining: remainingSec
      });

      // Auto-end turn when timer reaches 0 (only for current player)
      if (remainingSec === 0 && isMyTurn) {
        console.log('⏰ Timer expired! Auto-ending turn...');
        handleTimeExpired();
      }
    }, 100); // Update every 100ms for smoother countdown

    return () => {
      clearInterval(timer);
    };
  }, [phase, isMyTurn, handleTimeExpired]);

  const handleStartGame = async (turnTimer: number) => {
    if (!channelId) return;

    console.log('🎮 Starting game with timer:', turnTimer);
    await startGame(channelId, turnTimer);

    // Fetch hand after game starts
    if (myPlayerId) {
      await fetchMyHand(channelId, myPlayerId);
    }
  };

  const handleDrawTile = async () => {
    if (!channelId || !myPlayerId) return;

    try {
      console.log('🎴 Drawing tile');

      // Draw the tile from server first
      const drawnTile = await drawTile(channelId, myPlayerId);

      // Set the drawn tile ID for visual cue
      setDrawnTileId(drawnTile.id);
    } catch (error: any) {
      console.error('❌ Draw failed:', error);
      setDrawnTileId(null); // Clear on error
      // Show error if pool is empty
      if (error.message.includes('pool')) {
        setTurnError('No tiles left to draw!');
        setTimeout(() => setTurnError(null), 3000);
      }
    }
  };

  const handleEndTurn = async () => {
    if (!channelId) return;

    try {
      console.log('🔄 Attempting to end turn');
      await endTurn(channelId, myPlayerId || undefined);
      setTurnError(null);
      console.log('✅ Turn ended successfully');
    } catch (error: any) {
      console.error('❌ End turn failed:', error);

      // Extract error data from response
      const errorData = error.response?.data;
      const errorMsg = errorData?.error || error.message || 'Invalid board';
      const totalValue = errorData?.totalValue;

      // Show point total if available
      const displayMsg = totalValue !== undefined
        ? `${errorMsg} (${totalValue} points)`
        : errorMsg;

      setTurnError(displayMsg);
      setTimeout(() => setTurnError(null), 5000);
    }
  };

  const handleUndoTurn = async () => {
    if (!channelId || !myPlayerId) return;

    console.log('↩️ Undoing turn');
    await undoTurn(channelId, myPlayerId);
  };

  const handleUndoLastAction = async () => {
    if (!channelId || !myPlayerId) return;

    console.log('↩️ Undoing last action');
    await undoLastAction(channelId, myPlayerId);
  };

  // Helper: Find all tiles in a meld by setId
  const getTilesInMeld = (setId: string) => {
    return board.filter(t => t.setId === setId);
  };

  // Helper: Check if a position is valid and unoccupied
  const isPositionAvailable = (x: number, y: number, excludeTileIds: string[] = []) => {
    if (x < 0 || x > 24 || y < 0 || y > 9) return false;
    return !board.some(t => t.position.x === x && t.position.y === y && !excludeTileIds.includes(t.id));
  };

  // Helper: Find empty horizontal space for a meld of given length
  const findEmptySpaceForMeld = (meldLength: number): { x: number; y: number } | null => {
    // Try each row
    for (let y = 0; y <= 9; y++) {
      // Try each starting position (leave room for padding on sides)
      // Start at x=1 to ensure space on left, end at 24-meldLength to ensure space on right
      for (let startX = 1; startX <= 24 - meldLength; startX++) {
        // Check if all positions in this range are available
        let allAvailable = true;
        for (let x = startX; x < startX + meldLength; x++) {
          if (!isPositionAvailable(x, y)) {
            allAvailable = false;
            break;
          }
        }

        // Also check for free space on left and right sides
        const hasLeftSpace = isPositionAvailable(startX - 1, y);
        const hasRightSpace = isPositionAvailable(startX + meldLength, y);

        if (allAvailable && hasLeftSpace && hasRightSpace) {
          return { x: startX, y };
        }
      }
    }
    return null;
  };

  // Helper: Relocate entire meld to new position
  const relocateMeld = async (meldTiles: TileOnBoard[], newStartPosition: { x: number; y: number }) => {
    if (!channelId) return false;

    // Sort tiles by x position to maintain order
    const sortedTiles = [...meldTiles].sort((a, b) => a.position.x - b.position.x);

    console.log(`🔄 Relocating meld of ${sortedTiles.length} tiles to position (${newStartPosition.x}, ${newStartPosition.y})`);

    try {
      // Move each tile to its new position
      for (let i = 0; i < sortedTiles.length; i++) {
        const tile = sortedTiles[i];
        const newPosition = {
          x: newStartPosition.x + i,
          y: newStartPosition.y
        };

        await moveTile(channelId, tile.id, newPosition, tile.setId);
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to relocate meld:', error);
      return false;
    }
  };

  const handleTileDrop = async (
    tile: Tile,
    position: { x: number; y: number },
    fromBoard: boolean = false,
    tileId?: string
  ) => {
    console.log(`🎯 handleTileDrop - position: (${position.x}, ${position.y}), fromBoard: ${fromBoard}, tileId: ${tileId}`);

    if (!channelId || !myPlayerId) {
      console.log('❌ Missing channelId or myPlayerId');
      return;
    }

    // Position is already snapped by GameBoard.tsx - use it directly
    const snappedPosition = position;
    console.log(`📍 Using GameBoard position: (${snappedPosition.x}, ${snappedPosition.y})`);

    // Determine setId based on nearby tiles
    let snapToSetId: string | null = null;

    board.forEach(existingTile => {
      if (fromBoard && existingTile.id === tileId) return; // Skip self

      const dx = Math.abs(existingTile.position.x - position.x);
      const dy = Math.abs(existingTile.position.y - position.y);

      // If positioned next to an existing tile in the same row, use its setId
      if (dy === 0 && dx === 1) {
        snapToSetId = existingTile.setId;
      }
    });

    const setId = snapToSetId || `set-${Date.now()}`;

    // Check if position is occupied or out of bounds
    const excludeIds = fromBoard && tileId ? [tileId] : [];
    const positionBlocked = !isPositionAvailable(snappedPosition.x, snappedPosition.y, excludeIds);

    // If position is blocked and we're trying to extend an existing meld, relocate it
    if (positionBlocked && snapToSetId && !fromBoard) {
      console.log('⚠️ Position blocked, attempting to relocate meld...');

      // Get all tiles in the target meld
      const meldTiles = getTilesInMeld(snapToSetId);

      if (meldTiles.length > 0) {
        // Find new space for meld + new tile
        const newMeldLength = meldTiles.length + 1;
        const newLocation = findEmptySpaceForMeld(newMeldLength);

        if (newLocation) {
          console.log(`✨ Found new location at (${newLocation.x}, ${newLocation.y}) for ${newMeldLength} tiles`);

          // Relocate the existing meld
          const relocated = await relocateMeld(meldTiles, newLocation);

          if (relocated) {
            // Now place the new tile at the appropriate position
            const sortedMeld = [...meldTiles].sort((a, b) => a.position.x - b.position.x);

            // Determine if new tile should go at start or end
            // Check which side it was originally trying to extend
            const firstMeldX = sortedMeld[0].position.x;
            const lastMeldX = sortedMeld[sortedMeld.length - 1].position.x;
            const isExtendingRight = snappedPosition.x > lastMeldX || snappedPosition.x < firstMeldX ? snappedPosition.x > lastMeldX : true;

            const newTilePosition = isExtendingRight
              ? { x: newLocation.x + sortedMeld.length, y: newLocation.y }
              : { x: newLocation.x, y: newLocation.y };

            // If extending left, we need to shift all tiles by 1
            if (!isExtendingRight) {
              console.log('📍 Extending left, shifting meld positions');
              const shiftedLocation = { x: newLocation.x + 1, y: newLocation.y };
              await relocateMeld(meldTiles, shiftedLocation);
            }

            console.log(`🎴 Placing new tile at relocated position (${newTilePosition.x}, ${newTilePosition.y})`);
            await placeTile(channelId, myPlayerId, tile, newTilePosition, setId);
            return; // Success!
          } else {
            setTurnError('Failed to relocate meld');
            setTimeout(() => setTurnError(null), 3000);
            return;
          }
        } else {
          setTurnError('No space available to relocate meld');
          setTimeout(() => setTurnError(null), 3000);
          return;
        }
      }
    }

    try {
      if (fromBoard && tileId) {
        // Moving existing tile on board
        console.log('🔄 Moving tile on board with setId:', setId, 'at position:', snappedPosition);
        await moveTile(channelId, tileId, snappedPosition, setId);
      } else {
        // Placing new tile from hand
        console.log('🎴 Placing tile with setId:', setId, 'at position:', snappedPosition);
        await placeTile(channelId, myPlayerId, tile, snappedPosition, setId);

        // Mark this setId for relocation check after board state updates
        if (setId) {
          lastPlacedSetId.current = setId;
        }
      }
    } catch (error: any) {
      console.error('Failed to place/move tile:', error);
      setTurnError(error.message || 'Cannot place tile there!');
      setTimeout(() => setTurnError(null), 3000);
    }
  };

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Rummikub...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-red-900 flex items-center justify-center p-4">
        <div className="max-w-md bg-red-800 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <p className="mt-4 text-sm text-red-200">
            Please make sure you've set up your Discord application correctly.
          </p>
        </div>
      </div>
    );
  }

  const handleToggleReady = (playerId: string) => {
    if (!channelId) return;
    console.log('Toggle ready for player:', playerId);
    toggleReady(channelId, playerId);
  };

  // Lobby phase
  if (phase === GamePhase.LOBBY) {
    return (
      <Lobby
        players={players}
        onStartGame={handleStartGame}
        onToggleReady={handleToggleReady}
        myPlayerId={myPlayerId}
      />
    );
  }

  // Winner screen (add this before the final closing brace)
  if (phase === GamePhase.ENDED && winner) {
    return <WinnerScreen winner={winner} />;
  }

  // Playing phase
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen bg-gradient-to-br from-gray-900 to-slate-800 overflow-hidden flex p-3 gap-3">
        {/* Left Column: Board + Hand stacked - fills remaining space */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Game Board - takes remaining space */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <GameBoard
              tiles={board}
              onTileDrop={handleTileDrop}
            />
          </div>

          {/* Player Hand - fixed at bottom */}
          <div className="flex-shrink-0">
            <PlayerHand
              tiles={myHand.tiles}
              highlightTileId={drawnTileId}
            />
          </div>
        </div>

        {/* Right Column: Sidebar - full height */}
        <div className="w-80 space-y-2 overflow-y-auto flex-shrink-0">
          <GameControls
            isMyTurn={!!isMyTurn}
            canEndTurn={canEndTurn}
            canUndo={canUndo}
            canDraw={canDraw}
            timeRemaining={turnTimeRemaining}
            onDrawTile={handleDrawTile}
            onEndTurn={handleEndTurn}
            onUndo={handleUndoTurn}
            onUndoLast={handleUndoLastAction}
            onReset={async () => {
              console.log('🔄 onReset called, channelId:', channelId);
              if (channelId && participants) {
                console.log('📤 Re-initializing game with reset flag...');
                // Re-initialize the game instead of just deleting it
                // This creates a new game for all players
                const playersList: Player[] = Array.from(participants.values()).map(p => ({
                  id: p.id,
                  username: p.username,
                  avatar: p.avatar, // Use avatar directly from Discord SDK
                  tilesCount: 0,
                  hasPlayedInitial: false,
                  isReady: false,
                }));
                await initializeGame(channelId, playersList, true); // reset: true
                console.log('✅ Game reset complete - waiting for server broadcast to reload...');
                // Don't reload here - let the 'game-reset' event listener handle it
                // This prevents double-reloading for the initiating player
              } else {
                console.warn('⚠️ No channelId or participants available for reset');
              }
            }}
            poolSize={pool.length}
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            myPlayerId={myPlayerId}
            gamePhase={phase}
          />

          <PlayerList
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            myPlayerId={myPlayerId}
          />
        </div>

        {/* Turn Error Display */}
        {turnError && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {turnError}
          </div>
        )}
      </div>
    </DndProvider>
  );
}

export default App;