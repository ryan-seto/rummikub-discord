import React, { useEffect, useState, useRef } from 'react';
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

function App() {
  const { user, participants, isReady, error, channelId } = useDiscordSDK();
  const { onGameStateUpdate } = useSocket(channelId);

  const {
    phase,
    players,
    currentPlayerIndex,
    board,
    myHand,
    myPlayerId,
    turnTimeRemaining,
    setMyPlayerId,
    initializeGame,
    fetchMyHand,
    startGame,
    drawTile,
    placeTile,
    endTurn,
    undoTurn,
    addPlayer,
    syncGameState,
  } = useGameStore();

  const [hasInitialized, setHasInitialized] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const isSyncing = useRef(false);

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

      // Only first player initializes the game
      if (gamePlayers.length >= 2 && gamePlayers[0].id === user.id) {
        console.log('👑 First player - initializing game on server');
        initializeGame(channelId, gamePlayers);
      }

      setHasInitialized(true);
    }
  }, [isReady, user, channelId, participants, hasInitialized, setMyPlayerId, addPlayer, initializeGame]);

  // Fetch player's hand after game is initialized
  useEffect(() => {
    if (hasInitialized && channelId && myPlayerId && myHand.tiles.length === 0) {
      console.log('🎴 Fetching my hand from server');
      fetchMyHand(channelId, myPlayerId);
    }
  }, [hasInitialized, channelId, myPlayerId, myHand.tiles.length, fetchMyHand]);

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

      syncGameState(gameState);

      setTimeout(() => {
        isSyncing.current = false;
      }, 500);
    });

    return cleanup;
  }, [onGameStateUpdate, syncGameState]);

  const handleStartGame = async () => {
    if (!channelId) return;

    console.log('🎮 Starting game');
    await startGame(channelId);

    // Fetch hand after game starts
    if (myPlayerId) {
      await fetchMyHand(channelId, myPlayerId);
    }
  };

  const handleTileDrop = async (tile: Tile, position: { x: number; y: number }) => {
    if (!channelId || !myPlayerId) return;

    const SNAP_DISTANCE = 2;

    let snapToSetId: string | null = null;
    let snappedPosition = { ...position };

    board.forEach(existingTile => {
      const dx = Math.abs(existingTile.position.x - position.x);
      const dy = Math.abs(existingTile.position.y - position.y);

      if (dy <= 1 && dx <= SNAP_DISTANCE && dx > 0) {
        console.log('📎 Snapping to horizontal meld');
        snapToSetId = existingTile.setId;
        snappedPosition = {
          x: position.x > existingTile.position.x
            ? existingTile.position.x + 1
            : existingTile.position.x - 1,
          y: existingTile.position.y
        };
      }

      if (dx <= 1 && dy <= SNAP_DISTANCE && dy > 0) {
        console.log('📎 Snapping to vertical meld');
        snapToSetId = existingTile.setId;
        snappedPosition = {
          x: existingTile.position.x,
          y: position.y > existingTile.position.y
            ? existingTile.position.y + 1
            : existingTile.position.y - 1
        };
      }
    });

    const setId = snapToSetId || `set-${Date.now()}`;

    console.log('🎴 Placing tile with setId:', setId);
    await placeTile(channelId, myPlayerId, tile, snappedPosition, setId);
  };

  const handleDrawTile = async () => {
    if (!channelId || !myPlayerId) return;

    console.log('🎴 Drawing tile');
    await drawTile(channelId, myPlayerId);
  };

  const handleEndTurn = async () => {
    if (!channelId) return;

    try {
      console.log('🔄 Attempting to end turn');
      await endTurn(channelId);
      setTurnError(null);
      console.log('✅ Turn ended successfully');
    } catch (error: any) {
      console.error('❌ End turn failed:', error);
      setTurnError(error.message || 'Invalid board! Please arrange tiles into valid runs or groups.');
      setTimeout(() => setTurnError(null), 5000);
    }
  };

  const handleUndoTurn = async () => {
    if (!channelId || !myPlayerId) return;

    console.log('↩️ Undoing turn');
    await undoTurn(channelId, myPlayerId);
  };

  const isMyTurn = myPlayerId && players[currentPlayerIndex]?.id === myPlayerId;

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

  // Playing phase
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4 shadow-lg">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Rummikub
            </h1>
            <p className="text-gray-400">
              {isMyTurn ? "It's your turn!" : `${players[currentPlayerIndex]?.username}'s turn`}
            </p>

            {turnError && (
              <div className="mt-3 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold animate-pulse">
                ❌ {turnError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            {/* Game Board */}
            <div className="lg:col-span-3">
              <GameBoard
                tiles={board}
                onTileDrop={handleTileDrop}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <GameControls
                isMyTurn={!!isMyTurn}
                canEndTurn={board.length > 0}
                timeRemaining={turnTimeRemaining}
                onDrawTile={handleDrawTile}
                onEndTurn={handleEndTurn}
                onUndo={handleUndoTurn}
                poolSize={0}
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
        </div>
      </div>
    </DndProvider>
  );
}

export default App;