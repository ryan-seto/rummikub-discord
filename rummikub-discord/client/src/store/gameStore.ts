import { create } from 'zustand';
import { GameState, GamePhase, Player, Tile, TileOnBoard, PlayerHand } from '../types/game';

interface GameStore extends GameState {
  // Local player state
  myPlayerId: string | null;
  myHand: PlayerHand;

  // Actions now call server APIs
  initializeGame: (channelId: string, players: Player[]) => Promise<void>;
  fetchMyHand: (channelId: string, playerId: string) => Promise<void>;
  startGame: (channelId: string) => Promise<void>;
  drawTile: (channelId: string, playerId: string) => Promise<void>;
  placeTile: (channelId: string, playerId: string, tile: Tile, position: { x: number; y: number }, setId: string) => Promise<void>;
  endTurn: (channelId: string) => Promise<void>;
  undoTurn: (channelId: string, playerId: string) => Promise<void>;
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
  turnTimeRemaining: 120,
  myPlayerId: null,
  myHand: { tiles: [] },

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
        throw new Error('Failed to draw tile');
      }

      const data = await response.json();
      const { myHand } = get();

      set({ myHand: { tiles: [...myHand.tiles, data.tile] } });
      console.log('✅ Tile drawn');
    } catch (error) {
      console.error('❌ Failed to draw tile:', error);
    }
  },

  // Place tile on server
  placeTile: async (channelId: string, playerId: string, tile: Tile, position: { x: number; y: number }, setId: string) => {
    console.log('🎴 Placing tile on server...');
    const response = await fetch(`/api/games/${channelId}/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, tile, position, setId }),
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

  // End turn on server
  endTurn: async (channelId: string) => {
    console.log('🔄 Ending turn on server...');
    const response = await fetch(`/api/games/${channelId}/endturn`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Server rejected turn end:', errorData);
      throw new Error(errorData.error || 'Failed to end turn');
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

      // Add restored tiles back to hand
      set({ myHand: { tiles: [...myHand.tiles, ...data.restoredTiles] } });

      console.log('✅ Turn undone');
    } catch (error) {
      console.error('❌ Failed to undo turn:', error);
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
  syncGameState: (state: Partial<GameState>) => {
    console.log('📥 Syncing state from server:', state);
    set(state);
  },
}));