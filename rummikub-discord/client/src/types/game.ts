// Core game types
export enum TileColor {
  RED = 'red',
  BLUE = 'blue',
  YELLOW = 'yellow',
  BLACK = 'black',
}

export interface Tile {
  id: string;
  number: number; // 1-13, or 0 for joker
  color: TileColor | null; // null for joker
  isJoker: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface TileOnBoard extends Tile {
  position: Position;
  setId: string; // Which meld this tile belongs to
}

export type Meld = Tile[];

export enum MeldType {
  RUN = 'run', // Same color, consecutive numbers (e.g., 3-4-5 red)
  GROUP = 'group', // Same number, different colors (e.g., 7 red, 7 blue, 7 yellow)
}

export interface ValidatedMeld {
  tiles: Tile[];
  type: MeldType;
  isValid: boolean;
  points: number;
}

export interface Player {
  id: string;
  username: string;
  avatar: string | null;
  tilesCount: number; // Number of tiles in hand (hidden from others)
  hasPlayedInitial: boolean; // Has made initial 30-point meld
  isReady: boolean;
}

export interface PlayerHand {
  tiles: Tile[];
}

export enum GamePhase {
  LOBBY = 'lobby',
  PLAYING = 'playing',
  ENDED = 'ended',
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  board: TileOnBoard[]; // All tiles currently on the board
  pool: Tile[]; // Tiles still in the draw pile
  turnStartBoard: TileOnBoard[]; // Board state at start of turn (for undo)
  turnTimeRemaining: number; // Seconds remaining in current turn
  turnEndTime?: number; // Unix timestamp (ms) when current turn will end
  turnTimerDuration: number; // Configured turn duration in seconds (default 60)
}

export interface GameAction {
  type: 'PLACE_TILE' | 'DRAW_TILE' | 'END_TURN' | 'UNDO_TURN' | 'START_GAME' | 'PLAYER_JOIN' | 'PLAYER_LEAVE';
  payload?: any;
  playerId: string;
  timestamp: number;
}

// Discord-specific types
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

export interface DiscordChannel {
  id: string;
  type: number;
}

export interface DiscordParticipant {
  id: string;
  username: string;
  avatar: string | null;
}
