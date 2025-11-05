import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDiscordSDK } from './hooks/useDiscordSDK';
import { useGameStore } from './store/gameStore';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { PlayerHand } from './components/PlayerHand';
import { PlayerList } from './components/PlayerList';
import { GameControls } from './components/GameControls';
import { GamePhase, Player, Tile } from './types/game';
import { useSocket } from './hooks/useSocket';
import { TURN_TIME_SECONDS } from './constants';
import { WinnerScreen } from './components/WinnerScreen';
import DiscordLogin from './components/DiscordLogin'; // Import the login component
import OAuthCallback from './pages/OAuthCallback'; // Import the callback component

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
    addPlayer,
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
  const isSyncing = useRef(false);

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
        isReady: true,
      }));

      // Add current user if not in participants
      if (!gamePlayers.find(p => p.id === user.id)) {
        gamePlayers.push({
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          tilesCount: 0,
          hasPlayedInitial: false,
          isReady: true,
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
            isReady: true,
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
  }, [channelId, myPlayerId, undoTurn, drawTile, endTurn]);

  // Turn timer countdown
  useEffect(() => {
    if (phase !== GamePhase.PLAYING || !isMyTurn) return;

    // Reset timer when it becomes your turn
    useGameStore.setState({ turnTimeRemaining: TURN_TIME_SECONDS });

    const timer = setInterval(() => {
      const newTime = Math.max(0, useGameStore.getState().turnTimeRemaining - 1);

      useGameStore.setState({
        turnTimeRemaining: newTime
      });

      // Auto-end turn when timer reaches 0
      if (newTime === 0) {
        console.log('⏰ Timer expired! Auto-ending turn...');
        handleTimeExpired();
      }
    }, 1000);

    return () => {
      console.log('⏰ Cleaning up timer');
      clearInterval(timer);
    };
  }, [phase, isMyTurn, currentPlayerIndex, handleTimeExpired]); // ← Add handleTimeExpired

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
      await drawTile(channelId, myPlayerId);
    } catch (error: any) {
      console.error('❌ Draw failed:', error);
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
    console.log('🎯 handleTileDrop called:', { tile, position, fromBoard, tileId });

    if (!channelId || !myPlayerId) {
      console.log('❌ Missing channelId or myPlayerId');
      return;
    }

    // Edit to chnage snap sensitivity and meld spacing
    const SNAP_DISTANCE = 1;
    const ROW_HEIGHT = 1.25;
    const COL_WIDTH = 1;

    // Snap both X and Y to grid
    const snappedX = Math.round(position.x / COL_WIDTH) * COL_WIDTH;
    const snappedY = Math.round(position.y / ROW_HEIGHT) * ROW_HEIGHT;
    const adjustedPosition = { x: snappedX, y: snappedY };

    let snapToSetId: string | null = null;
    let snappedPosition = adjustedPosition;
    let closestDistance = Infinity;

    // Find the CLOSEST tile to snap to (ONLY in the same row)
    // Exclude the tile being moved if it's from the board
    board.forEach(existingTile => {
      if (fromBoard && existingTile.id === tileId) return; // Skip self

      const dx = Math.abs(existingTile.position.x - adjustedPosition.x);
      const dy = Math.abs(existingTile.position.y - adjustedPosition.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // ONLY snap if in EXACT same row (dy === 0) and within horizontal distance
      if (dy === 0 && dx <= SNAP_DISTANCE && dx > 0 && distance < closestDistance) {
        console.log(`📎 Found nearby tile ${existingTile.number}-${existingTile.color} at distance ${distance}`);
        closestDistance = distance;
        snapToSetId = existingTile.setId;

        if (adjustedPosition.x > existingTile.position.x) {
          // RIGHT
          snappedPosition = {
            x: existingTile.position.x + 1,
            y: existingTile.position.y
          };
        } else {
          // LEFT
          snappedPosition = {
            x: existingTile.position.x - 1,
            y: existingTile.position.y
          };
        }
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

  // Lobby phase
  if (phase === GamePhase.LOBBY) {
    return (
      <Lobby
        players={players}
        onStartGame={handleStartGame}
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                Rummy
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            {/* Game Board */}
            <div className="lg:col-span-3 min-h-[600px]">
              <GameBoard
                tiles={board}
                onTileDrop={handleTileDrop}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <GameControls
                isMyTurn={!!isMyTurn}
                canEndTurn={canEndTurn}
                canDraw={canDraw}
                timeRemaining={turnTimeRemaining}
                onDrawTile={handleDrawTile}
                onEndTurn={handleEndTurn}
                onUndo={handleUndoTurn}
                onUndoLast={handleUndoLastAction}
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
          </div>

          {/* Player Hand */}
          <PlayerHand
            tiles={myHand.tiles}
          />

          {/* Turn Error Display */}
          {turnError && (
            <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
              {turnError}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}

export default App;