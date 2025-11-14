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
import { TileDrawAnimation } from './components/TileDrawAnimation';
import { GamePhase, Player, Tile } from './types/game';
import { useSocket } from './hooks/useSocket';
import { WinnerScreen } from './components/WinnerScreen';

function App() {
  const { user, participants, isReady, error, channelId } = useDiscordSDK();
  const { onGameStateUpdate } = useSocket(channelId);
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
  const [drawingTile, setDrawingTile] = useState<Tile | null>(null);
  const isSyncing = useRef(false);
  const isHandlingTimeout = useRef(false);

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

      // Check for winner
      if (gameState.phase === 'ended' && gameState.winner) {
        setWinner(gameState.winner);
      }

      syncGameState(gameState);

      setTimeout(() => {
        isSyncing.current = false;
      }, 500);
    });

    return cleanup;
  }, [onGameStateUpdate, syncGameState]);

  const isMyTurn = myPlayerId && players[currentPlayerIndex]?.id === myPlayerId;

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
      const { turnEndTime } = state;

      if (!turnEndTime) return;

      // Calculate remaining time from server timestamp
      const now = Date.now();
      const remainingMs = Math.max(0, turnEndTime - now);
      const remainingSec = Math.floor(remainingMs / 1000);

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

  const handleStartGame = async () => {
    if (!channelId) return;

    console.log('🎮 Starting game');
    await startGame(channelId);

    // Fetch hand after game starts
    if (myPlayerId) {
      await fetchMyHand(channelId, myPlayerId);
    }
  };

  const handleDrawTile = async () => {
    if (!channelId || !myPlayerId) return;

    try {
      console.log('🎴 Drawing tile');

      // Trigger animation with a placeholder tile (we'll get the real one from the server)
      setDrawingTile({
        id: 'temp',
        number: 0,
        color: null,
        isJoker: false,
      });

      await drawTile(channelId, myPlayerId);
    } catch (error: any) {
      console.error('❌ Draw failed:', error);
      setDrawingTile(null); // Clear animation on error
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

    try {
      if (fromBoard && tileId) {
        // Moving existing tile on board
        console.log('🔄 Moving tile on board with setId:', setId, 'at position:', snappedPosition);
        await moveTile(channelId, tileId, snappedPosition, setId);
      } else {
        // Placing new tile from hand
        console.log('🎴 Placing tile with setId:', setId, 'at position:', snappedPosition);
        await placeTile(channelId, myPlayerId, tile, snappedPosition, setId);
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
              if (channelId) {
                await resetGame(channelId);
                window.location.reload();
              }
            }}
            poolSize={pool.length}
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            myPlayerId={myPlayerId}
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

        {/* Tile Draw Animation */}
        <TileDrawAnimation
          tile={drawingTile}
          onComplete={() => setDrawingTile(null)}
        />
      </div>
    </DndProvider>
  );
}

export default App;