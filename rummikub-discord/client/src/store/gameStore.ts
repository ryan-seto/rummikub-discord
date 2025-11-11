import { create } from 'zustand';
import { GameState, GamePhase, Player, Tile, TileOnBoard, PlayerHand } from '../types/game';

// Server URL - uses environment variable in production, localhost in dev
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface GameStore extends GameState {
  // Local player state
  myPlayerId: string | null;
  myHand: PlayerHand;
  canDraw: boolean;
  canUndo: boolean;
  canEndTurn: boolean;

  // Actions now call server APIs
  initializeGame: (channelId: string, players: Player[]) => Promise<void>;
  fetchMyHand: (channelId: string, playerId: string) => Promise<void>;
  startGame: (channelId: string) => Promise<void>;
  drawTile: (channelId: string, playerId: string) => Promise<void>;
  placeTile: (channelId: string, playerId: string, tile: Tile, position: { x: number; y: number }, setId: string) => Promise<void>;
  moveTile: (channelId: string, tileId: string, position: { x: number; y: number }, setId: string) => Promise<void>;
  endTurn: (channelId: string, playerId?: string) => Promise<void>;  // ← Add playerId param
  undoTurn: (channelId: string, playerId: string) => Promise<void>;
  undoLastAction: (channelId: string, playerId: string) => Promise<void>;
  resetGame: (channelId: string) => Promise<void>;
  setMyPlayerId: (id: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  syncGameState: (state: Partial<GameState>) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  id: '',
  phase: GamePhase.LOBBY,
  players: [],
  currentPlayerIndex: 0,
  board: [],
  pool: [],
  turnStartBoard: [],
  turnTimeRemaining: 0, // Will be calculated from turnEndTime
  myPlayerId: null,
  myHand: { tiles: [] },
  canDraw: true,
  canUndo: false,
  canEndTurn: false,

  // Initialize game on server
  initializeGame: async (channelId: string, players: Player[]) => {
    try {
      console.log('🎮 Initializing game on server...');
      const response = await fetch('/api/games/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, players }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize game');
      }

      const data = await response.json();
      console.log('✅ Game initialized:', data);

      set({
        id: channelId,
        players: players.map(p => ({ ...p, tilesCount: 14 })),
        phase: GamePhase.LOBBY,
      });
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
    }
  },

  // Fetch player's hand from server
  fetchMyHand: async (channelId: string, playerId: string) => {
    try {
      const { myHand } = get();

      // Don't fetch if we already have tiles
      if (myHand.tiles.length > 0) {
        console.log('✅ Hand already fetched, skipping');
        return;
      }

      console.log('🎴 Fetching hand from server...');
      const response = await fetch(`/api/games/${channelId}/hand/${playerId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch hand');
      }

      const data = await response.json();
      console.log('✅ Hand fetched:', data.hand.length, 'tiles');

      set({ myHand: { tiles: data.hand } });
    } catch (error) {
      console.error('❌ Failed to fetch hand:', error);
    }
  },

  // Start game on server
  startGame: async (channelId: string) => {
    try {
      console.log('🎮 Starting game on server...');
      const response = await fetch(`/api/games/${channelId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start game');
      }

      console.log('✅ Game started');
      set({ phase: GamePhase.PLAYING });
    } catch (error) {
      console.error('❌ Failed to start game:', error);
    }
  },

  // Draw tile from server
  drawTile: async (channelId: string, playerId: string) => {
    try {
      console.log('🎴 Drawing tile from server...');
      const response = await fetch(`/api/games/${channelId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server rejected draw:', errorData);
        throw new Error(errorData.error || 'Failed to draw tile');
      }

      const data = await response.json();
      const { myHand } = get();

      set({ myHand: { tiles: [...myHand.tiles, data.tile] } });
      console.log('✅ Tile drawn');
    } catch (error: any) {
      console.error('❌ Failed to draw tile:', error.message);
      throw error;
    }
  },

  // Place tile on server
  placeTile: async (channelId: string, playerId: string, tile: Tile, position: { x: number; y: number }, setId: string) => {
    console.log('🎴 Placing tile on server...');
    const response = await fetch(`/api/games/${channelId}/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, tile, position, setId }),  // ← playerId is already here, good!
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Server rejected tile placement:', errorData);
      throw new Error(errorData.error || 'Failed to place tile');
    }

    // Remove from local hand
    const { myHand } = get();
    set({ myHand: { tiles: myHand.tiles.filter(t => t.id !== tile.id) } });

    console.log('✅ Tile placed');
  },

  // Move tile on board
  moveTile: async (channelId: string, tileId: string, position: { x: number; y: number }, setId: string) => {
    console.log('🔄 Moving tile on server...');
    const { myPlayerId } = get();  // ← Get playerId
    const response = await fetch(`/api/games/${channelId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tileId, newPosition: position, newSetId: setId, playerId: myPlayerId }),  // ← Add playerId
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Server rejected tile move:', errorData);
      throw new Error(errorData.error || 'Failed to move tile');
    }

    console.log('✅ Tile moved');
  },

  // End turn on server
  endTurn: async (channelId: string, playerId?: string) => {  // ← Add playerId param
    console.log('🔄 Ending turn on server...');
    const response = await fetch(`/api/games/${channelId}/endturn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),  // ← Send playerId
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Server rejected turn end:', errorData);

      // Include the full error data in the thrown error
      const error: any = new Error(errorData.error || 'Failed to end turn');
      error.response = { data: errorData };  // ← Attach response data
      throw error;
    }

    console.log('✅ Turn ended');
  },

  // Undo turn on server
  undoTurn: async (channelId: string, playerId: string) => {
    try {
      console.log('↩️ Undoing turn on server...');
      const response = await fetch(`/api/games/${channelId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to undo turn');
      }

      const data = await response.json();
      const { myHand } = get();

      // Remove duplicates by ID before adding restored tiles
      const existingIds = new Set(myHand.tiles.map(t => t.id));
      const uniqueRestoredTiles = data.restoredTiles.filter((t: any) => !existingIds.has(t.id));

      set({ myHand: { tiles: [...myHand.tiles, ...uniqueRestoredTiles] } });

      console.log('✅ Turn undone');
    } catch (error) {
      console.error('❌ Failed to undo turn:', error);
    }
  },

  // Undo last action
  undoLastAction: async (channelId: string, playerId: string) => {
    try {
      console.log('↩️ Undoing last action...');
      const response = await fetch(`/api/games/${channelId}/undolast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to undo last action');
      }

      const data = await response.json();
      const { myHand } = get();

      // If action returned tile to hand, check for duplicates
      if (data.undoneAction && data.undoneAction.fromHand) {
        const returnedTile = data.undoneAction.tile;

        // Only add if not already in hand
        const alreadyInHand = myHand.tiles.some(t => t.id === returnedTile.id);
        if (!alreadyInHand) {
          set({ myHand: { tiles: [...myHand.tiles, returnedTile] } });
        }
      }

      console.log('✅ Last action undone');
    } catch (error: any) {
      console.error('❌ Failed to undo last action:', error);
    }
  },

  // Reset game
  resetGame: async (channelId: string) => {
    try {
      console.log('🔄 Resetting game...');
      const response = await fetch(`/api/games/${channelId}/reset`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset game');
      }

      console.log('✅ Game reset - reload page to start fresh');

      // Reset local state
      set({
        phase: GamePhase.LOBBY,
        board: [],
        myHand: { tiles: [] },
        turnTimeRemaining: 0,
        canDraw: true,
        canUndo: false,
        canEndTurn: false,
      });
    } catch (error) {
      console.error('❌ Failed to reset game:', error);
    }
  },

  // Set local player ID
  setMyPlayerId: (id: string) => {
    set({ myPlayerId: id });
  },

  // Add player to local state
  addPlayer: (player: Player) => {
    const { players } = get();
    if (players.find(p => p.id === player.id)) return;
    set({ players: [...players, player] });
  },

  // Remove player from local state
  removePlayer: (playerId: string) => {
    const { players } = get();
    set({ players: players.filter(p => p.id !== playerId) });
  },

  // Sync game state from server broadcast
  syncGameState: (state: Partial<GameState> & { poolSize?: number }) => {
    console.log('📥 Syncing state from server:', state);

    // If poolSize is provided, create a fake pool array with that length
    if (state.poolSize !== undefined) {
      const fakePool = Array(state.poolSize).fill({ id: 'pool-tile' });
      set({
        ...state,
        pool: fakePool
      });
    } else {
      set(state);
    }
  },
}));