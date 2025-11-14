import express, { Request, Response, NextFunction } from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import authRouter from './routes/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: '/socket.io', // Default Socket.IO path
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Add connection error logging
io.engine.on("connection_error", (err) => {
  console.error("Socket.IO connection error:", err);
});

const PORT = process.env.PORT || 3001;

// Log environment variables on startup
console.log('Environment Variables:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VITE_DISCORD_CLIENT_ID:', process.env.VITE_DISCORD_CLIENT_ID ? 'Set' : 'Not Set');
console.log('DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? 'Set' : 'Not Set');
console.log('DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI);


app.use((req, res, next) => {
  console.log('Incoming request origin:', req.headers.origin);
  next();
});

// MIDDLEWARE
// const allowedOrigins = process.env.NODE_ENV === 'production'
//   ? [
//     'https://rummikub-discord.vercel.app',
//     'https://discord.com',
//     'https://ptb.discord.com',
//     'https://canary.discord.com',
//     'https://1432451260484943933.discordsays.com'
//   ]
//   : '*';

// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true
// }));

// Temporary CORS configuration to allow all origins
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true // Allow cookies and credentials
}));
app.use(express.json());

// app.use('/auth', authRouter);

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth token exchange endpoint
app.post('/api/token', async (req: Request, res: Response) => {
  console.log('POST /api/token called');
  try {
    const { code } = req.body;

    if (!code) {
      console.error('No authorization code provided');
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.VITE_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI; // make sure this is set on Render

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Discord credentials or redirect URI');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    console.log('Exchanging token with Discord for code:', code);
    console.log('Token exchange parameters:', params.toString());

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    console.log('Discord response status:', response.status);

    const data = await response.json() as { access_token?: string; error?: string; error_description?: string };

    if (!response.ok) {
      console.error('Discord OAuth error:', data);
      return res.status(response.status).json({ error: 'Failed to exchange token', details: data });
    }

    if (!data.access_token) {
      console.error('No access token returned by Discord:', data);
      return res.status(500).json({ error: 'Discord did not return an access token', details: data });
    }

    console.log('Token exchange successful');
    res.json({ access_token: data.access_token });

  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Internal server error', details: error });
  }
});


// Game state storage with private hands
interface ServerGameState {
  id: string;
  phase: string;
  players: any[];
  currentPlayerIndex: number;
  board: any[];
  pool: any[];
  turnStartBoard: any[];
  playerHands: { [playerId: string]: any[] };
  actionHistory: TurnAction[];
  hasDrawnThisTurn: boolean;
  turnEndTime: number; // Unix timestamp (ms) when current turn will end
}

interface TurnAction {
  type: 'place' | 'move';
  tile: any;
  fromPosition?: { x: number; y: number };
  toPosition: { x: number; y: number };
  oldSetId?: string;
  newSetId: string;
  fromHand?: boolean;
  timestamp: number;
}

const games = new Map<string, ServerGameState>();

// Game constants
const TURN_TIME_SECONDS = 60;

function createTilePool() {
  const tiles = [];
  const colors = ['red', 'blue', 'yellow', 'black'];
  let id = 0;

  // TESTING: Create only 1-5 instead of 1-13
  for (let set = 0; set < 2; set++) {
    for (const color of colors) {
      for (let num = 1; num <= 13; num++) {
        tiles.push({
          id: `tile-${id++}`,  // ← This increments for each tile
          number: num,
          color,
          isJoker: false,
        });
      }
    }
  }

  // Add 2 jokers
  tiles.push(
    { id: `tile-${id++}`, number: 0, color: null, isJoker: true },
    { id: `tile-${id++}`, number: 0, color: null, isJoker: true }
  );

  return tiles;
}

function shuffleTiles(tiles: any[]) {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate meld value - jokers are valued at what they represent
function calculateMeldValue(tiles: any[]): number {
  const jokers = tiles.filter(t => t.isJoker);
  const regularTiles = tiles.filter(t => !t.isJoker);

  // If no jokers, just sum the regular tiles
  if (jokers.length === 0) {
    return regularTiles.reduce((sum, tile) => sum + tile.number, 0);
  }

  // If all jokers, assume minimum value (would need context to know actual value)
  if (regularTiles.length === 0) {
    return jokers.length * 1; // Conservative estimate
  }

  // Determine if it's a run or group based on regular tiles
  const allSameColor = regularTiles.every(t => t.color === regularTiles[0].color);
  const allSameNumber = regularTiles.every(t => t.number === regularTiles[0].number);

  if (allSameNumber) {
    // It's a GROUP - all tiles including jokers represent the same number
    const number = regularTiles[0].number;
    return (regularTiles.length + jokers.length) * number;
  } else if (allSameColor) {
    // It's a RUN - jokers fill gaps in the sequence
    const numbers = regularTiles.map(t => t.number).sort((a, b) => a - b);
    const minNum = numbers[0];

    // Calculate total by summing the complete sequence
    let total = 0;
    for (let i = minNum; i <= minNum + tiles.length - 1; i++) {
      total += i;
    }
    return total;
  }

  // Fallback: sum regular tiles + jokers as 1
  return regularTiles.reduce((sum, tile) => sum + tile.number, 0) + jokers.length;
}

// Group tiles into melds by spatial connectivity (same Y position, consecutive X positions)
function groupTilesIntoMelds(board: any[]): any[][] {
  if (board.length === 0) return [];

  // Group tiles by Y position first
  const rowGroups: { [y: number]: any[] } = {};
  board.forEach(tile => {
    const y = tile.position.y;
    if (!rowGroups[y]) {
      rowGroups[y] = [];
    }
    rowGroups[y].push(tile);
  });

  const melds: any[][] = [];

  // For each row, group tiles that are adjacent (consecutive X positions)
  Object.values(rowGroups).forEach(rowTiles => {
    // Sort by X position
    const sorted = rowTiles.sort((a, b) => a.position.x - b.position.x);

    let currentMeld: any[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevTile = sorted[i - 1];
      const currTile = sorted[i];

      // Check if tiles are adjacent (consecutive X positions)
      if (currTile.position.x === prevTile.position.x + 1) {
        currentMeld.push(currTile);
      } else {
        // Gap detected - start new meld
        melds.push(currentMeld);
        currentMeld = [currTile];
      }
    }

    // Add the last meld
    if (currentMeld.length > 0) {
      melds.push(currentMeld);
    }
  });

  return melds;
}

// Validate initial meld requirement
function validateInitialMeld(board: any[], playerId: string, game: any): { valid: boolean; message?: string; totalValue?: number } {
  const player = game.players.find((p: any) => p.id === playerId);

  // If player has already played initial meld, they're good
  if (player?.hasPlayedInitial) {
    console.log(`✅ Player ${player.username} has already completed initial meld`);
    return { valid: true };
  }

  console.log(`🔍 Checking initial meld for player ${player?.username}`);

  // Get tiles placed from hand this turn (from action history)
  const tilesPlacedThisTurn = game.actionHistory
    .filter((action: TurnAction) => action.type === 'place' && action.fromHand)
    .map((action: TurnAction) => action.tile.id);

  if (tilesPlacedThisTurn.length === 0) {
    console.log(`❌ No tiles placed from hand this turn`);
    return { valid: false, message: 'Initial meld must be at least 30 points', totalValue: 0 };
  }

  console.log(`📋 Tiles placed this turn: ${tilesPlacedThisTurn.length}`);

  // Group tiles into melds
  const meldGroups = groupTilesIntoMelds(board);
  const completeMelds = meldGroups.filter(meld => meld.length >= 3);

  if (completeMelds.length === 0) {
    console.log(`❌ No complete melds found`);
    return { valid: false, message: 'Initial meld must be at least 30 points', totalValue: 0 };
  }

  // Calculate total value of melds that contain at least one tile placed from hand this turn
  let totalValue = 0;
  completeMelds.forEach(meld => {
    // Check if this meld contains at least one tile placed from hand this turn
    const hasTileFromThisTurn = meld.some(tile => tilesPlacedThisTurn.includes(tile.id));

    if (hasTileFromThisTurn && (isValidRun(meld) || isValidGroup(meld))) {
      const meldValue = calculateMeldValue(meld);
      console.log(`  Meld with new tile(s): ${meld.map(t => `${t.number}-${t.color}`).join(', ')} = ${meldValue} points`);
      totalValue += meldValue;
    }
  });

  console.log(`📊 Total meld value: ${totalValue} points`);

  if (totalValue < 30) {
    return {
      valid: false,
      message: `Initial meld must be at least 30 points (currently ${totalValue})`,
      totalValue
    };
  }

  console.log(`✅ Initial meld requirement met with ${totalValue} points!`);
  return { valid: true, totalValue };
}

// Initialize a new game
app.post('/api/games/init', (req: Request, res: Response) => {
  const { channelId, players, reset } = req.body;

  if (!channelId || !players || players.length < 2) {
    return res.status(400).json({ error: 'Invalid game initialization' });
  }

  const gameId = channelId;

  // Check if game already exists - either reset or skip
  if (games.has(gameId)) {
    if (reset) {
      console.log(`🔄 Resetting existing game ${gameId}`);
      games.delete(gameId);
    } else {
      console.log(`🎮 Game ${gameId} already exists, skipping initialization`);
      return res.json({ success: true, gameId, alreadyExists: true });
    }
  }

  // Create and shuffle tiles
  const allTiles = createTilePool();
  const shuffled = shuffleTiles(allTiles);

  // Deal 7 tiles to each player
  const playerHands: { [playerId: string]: any[] } = {};
  let tileIndex = 0;

  players.forEach((player: any) => {
    playerHands[player.id] = shuffled.slice(tileIndex, tileIndex + 14);
    tileIndex += 14;
  });

  const pool = shuffled.slice(tileIndex);

  const gameState: ServerGameState = {
    id: gameId,
    phase: 'lobby',
    players: players.map((p: any) => ({
      ...p,
      tilesCount: 14,
      hasPlayedInitial: false,
      isReady: false,
    })),
    currentPlayerIndex: 0,
    board: [],
    pool,
    turnStartBoard: [],
    playerHands,
    actionHistory: [],
    hasDrawnThisTurn: false,
    turnEndTime: 0, // Will be set when game starts
  };

  games.set(gameId, gameState);

  console.log(`🎮 Game initialized for channel ${channelId} with ${players.length} players`);
  res.json({ success: true, gameId });
});

// Toggle player ready status
app.post('/api/games/:gameId/players/:playerId/ready', (req: Request, res: Response) => {
  const { gameId, playerId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Find and toggle player
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  player.isReady = !player.isReady;
  console.log(`✓ Player ${playerId} ready status: ${player.isReady}`);

  // Broadcast updated state to all clients in this channel
  io.to(gameId).emit('gameStateUpdate', {
    players: game.players,
  });

  res.json({ success: true, isReady: player.isReady });
});

// Get player's private hand
app.get('/api/games/:gameId/hand/:playerId', (req: Request, res: Response) => {
  const { gameId, playerId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const hand = game.playerHands[playerId] || [];
  res.json({ hand });
});

// Get public game state (no hands)
app.get('/api/games/:gameId/state', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Send public state
  const publicState = {
    phase: game.phase,
    players: game.players.map(p => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
  };

  res.json(publicState);
});

// Reset/delete a game
app.post('/api/games/:gameId/reset', (req: Request, res: Response) => {
  const { gameId } = req.params;

  if (games.has(gameId)) {
    games.delete(gameId);
    console.log(`🔄 Game ${gameId} reset/deleted`);

    // Broadcast reset to all clients
    io.to(gameId).emit('game-reset');

    return res.json({ success: true, message: 'Game reset successfully' });
  }

  res.status(404).json({ error: 'Game not found' });
});

// Start game
app.post('/api/games/:gameId/start', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  game.phase = 'playing';
  game.turnEndTime = Date.now() + (TURN_TIME_SECONDS * 1000);
  games.set(gameId, game);

  console.log(`🎮 Game ${gameId} started`);

  // Broadcast to all clients in this game
  const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    canDraw: game.actionHistory.length === 0,
    canUndo: game.actionHistory.length > 0,
    canEndTurn: isBoardValidForEndTurn(game, currentPlayerId),
    turnEndTime: game.turnEndTime,
  });

  res.json({ success: true });
});

// Place tile
app.post('/api/games/:gameId/place', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { playerId, tile, position, setId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Check if it's this player's turn
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (playerId && currentPlayer.id !== playerId) {
    console.log(`❌ Not player ${playerId}'s turn (current: ${currentPlayer.id})`);
    return res.status(403).json({ error: 'Not your turn' });
  }

  console.log(`🎴 Attempting to place tile ${tile.number}-${tile.color} at position:`, position);

  // Check if position is already occupied
  const existingTileAtPosition = game.board.find(
    t => t.position.x === position.x && t.position.y === position.y
  );

  if (existingTileAtPosition) {
    console.log(`❌ Position (${position.x}, ${position.y}) already occupied`);
    return res.status(400).json({ error: 'Position already occupied' });
  }

  // If joining an existing meld (setId exists on board), validate it
  const existingMeldTiles = game.board.filter(t => t.setId === setId);

  if (existingMeldTiles.length > 0) {
    // This tile is joining an existing meld
    const updatedMeld = [...existingMeldTiles, { ...tile, position, setId }];

    console.log(`🔍 Validating meld with new tile:`, updatedMeld.map(t => `${t.number}-${t.color} at x:${t.position.x}`));

    // Check if meld could be valid
    const isPossible = canBecomeValidMeld(updatedMeld);

    if (!isPossible) {
      console.log(`❌ Invalid meld - tile ${tile.number}-${tile.color} doesn't fit`);
      return res.status(400).json({ error: 'Tile does not form a valid meld with existing tiles' });
    }

    // Check if visual order matches numeric order (for runs)
    const allSameColor = updatedMeld.every(t => t.color === updatedMeld[0].color);
    if (allSameColor) {
      // Sort by position (visual order)
      const byPosition = [...updatedMeld].sort((a, b) => a.position.x - b.position.x);
      // Sort by number (logical order)
      const byNumber = [...updatedMeld].sort((a, b) => a.number - b.number);

      // Check if visual order matches numeric order
      const visualOrder = byPosition.map(t => t.number).join('-');
      const logicalOrder = byNumber.map(t => t.number).join('-');

      console.log(`Visual order: ${visualOrder}, Logical order: ${logicalOrder}`);

      if (visualOrder !== logicalOrder) {
        console.log(`❌ Visual order doesn't match numeric order`);
        return res.status(400).json({ error: 'Tiles must be placed in numeric order (left to right)' });
      }
    }

    console.log(`✅ Valid meld with correct visual order!`);
  }

  // Remove from hand
  const hand = game.playerHands[playerId];
  if (!hand) {
    return res.status(400).json({ error: 'Player not found' });
  }

  game.playerHands[playerId] = hand.filter(t => t.id !== tile.id);

  // Add to board
  game.board.push({ ...tile, position, setId });

  // Track action in history
  game.actionHistory.push({
    type: 'place',
    tile: { ...tile, position, setId },
    toPosition: position,
    newSetId: setId,
    fromHand: true,
    timestamp: Date.now()
  });

  games.set(gameId, game);

  console.log(`✅ Tile ${tile.number}-${tile.color} placed at (${position.x}, ${position.y})`);

  // Check for win condition after placing
  if (checkWinCondition(game, playerId)) {
    console.log(`🎉 Player wins by placing last tile!`);
    game.phase = 'ended';

    const winner = game.players.find((p: any) => p.id === playerId);

    // Delay the win broadcast by 1.5 seconds so player can see their tile placement
    setTimeout(() => {
      io.to(gameId).emit('game-state-update', {
        phase: 'ended',
        winner: winner,
        players: game.players.map((p: any) => ({
          id: p.id,
          username: p.username,
          avatar: p.avatar,
          tilesCount: game.playerHands[p.id]?.length || 0,
          hasPlayedInitial: p.hasPlayedInitial,
          isReady: p.isReady,
        })),
        currentPlayerIndex: game.currentPlayerIndex,
        board: game.board,
        poolSize: game.pool.length,
      });
    }, 1000); // 1 second delay

    return res.json({ success: true, winner: winner });
  }

  // Broadcast updated board
  const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    canDraw: game.actionHistory.length === 0,
    canUndo: game.actionHistory.length > 0,
    canEndTurn: isBoardValidForEndTurn(game, currentPlayerId),
    turnEndTime: game.turnEndTime,
  });

  res.json({ success: true });
});

// Move tile on board (for rearranging)
app.post('/api/games/:gameId/move', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { tileId, newPosition, newSetId, playerId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Check if it's this player's turn
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (playerId && currentPlayer.id !== playerId) {
    console.log(`❌ Not player ${playerId}'s turn (current: ${currentPlayer.id})`);
    return res.status(403).json({ error: 'Not your turn' });
  }

  console.log(`🔄 Moving tile ${tileId} to position:`, newPosition);

  // Find the tile on the board
  const tileIndex = game.board.findIndex(t => t.id === tileId);

  if (tileIndex === -1) {
    return res.status(404).json({ error: 'Tile not found on board' });
  }

  const tile = game.board[tileIndex];
  const oldPosition = tile.position;
  const oldSetId = tile.setId;

  // Check if new position is occupied by a different tile
  const existingTileAtPosition = game.board.find(
    t => t.id !== tileId && t.position.x === newPosition.x && t.position.y === newPosition.y
  );

  if (existingTileAtPosition) {
    console.log(`❌ Position (${newPosition.x}, ${newPosition.y}) already occupied`);
    return res.status(400).json({ error: 'Position already occupied' });
  }

  // If joining an existing meld, validate it
  const existingMeldTiles = game.board.filter(t => t.setId === newSetId && t.id !== tileId);

  if (existingMeldTiles.length > 0) {
    const updatedMeld = [...existingMeldTiles, { ...tile, position: newPosition, setId: newSetId }];

    console.log(`🔍 Validating meld after move:`, updatedMeld.map(t => `${t.number}-${t.color} at x:${t.position.x}`));

    const isPossible = canBecomeValidMeld(updatedMeld);

    if (!isPossible) {
      console.log(`❌ Invalid meld after move`);
      return res.status(400).json({ error: 'Tile does not form a valid meld at new position' });
    }

    // Check visual order for runs
    const allSameColor = updatedMeld.every(t => t.color === updatedMeld[0].color);
    if (allSameColor) {
      const byPosition = [...updatedMeld].sort((a, b) => a.position.x - b.position.x);
      const byNumber = [...updatedMeld].sort((a, b) => a.number - b.number);

      const visualOrder = byPosition.map(t => t.number).join('-');
      const logicalOrder = byNumber.map(t => t.number).join('-');

      console.log(`Visual order: ${visualOrder}, Logical order: ${logicalOrder}`);

      if (visualOrder !== logicalOrder) {
        console.log(`❌ Visual order doesn't match numeric order`);
        return res.status(400).json({ error: 'Tiles must be placed in numeric order (left to right)' });
      }
    }
  }

  // Update tile position and setId
  game.board[tileIndex] = {
    ...tile,
    position: newPosition,
    setId: newSetId
  };

  // Track action in history
  game.actionHistory.push({
    type: 'move',
    tile: { ...tile },
    fromPosition: oldPosition,
    toPosition: newPosition,
    oldSetId: oldSetId,
    newSetId: newSetId,
    timestamp: Date.now()
  });

  games.set(gameId, game);

  console.log(`✅ Tile ${tile.number}-${tile.color} moved to (${newPosition.x}, ${newPosition.y})`);

  // Broadcast updated board
  const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    canDraw: game.actionHistory.length === 0,
    canUndo: game.actionHistory.length > 0,
    canEndTurn: isBoardValidForEndTurn(game, currentPlayerId),
    turnEndTime: game.turnEndTime,
  });

  res.json({ success: true });
});

// Check if tiles COULD become a valid run or group
function canBecomeValidMeld(tiles: any[]): boolean {
  console.log('🔍 Checking tiles:', tiles.map(t => t.isJoker ? 'JOKER' : `${t.number}-${t.color}`));

  // Separate jokers from regular tiles
  const jokers = tiles.filter(t => t.isJoker);
  const regularTiles = tiles.filter(t => !t.isJoker);

  console.log(`Found ${jokers.length} joker(s) and ${regularTiles.length} regular tile(s)`);

  // If all jokers, can become anything
  if (regularTiles.length === 0) {
    return tiles.length <= 13; // Max meld size
  }

  // Check if it could become a valid run
  const allSameColor = regularTiles.every(t => t.color === regularTiles[0].color);

  if (allSameColor) {
    console.log('✓ All same color - checking for run...');

    const numbers = regularTiles.map(t => t.number).sort((a, b) => a - b);
    console.log('Numbers sorted:', numbers);

    // Check for duplicates in regular tiles
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      console.log('✗ Has duplicate numbers, checking if group...');
      return canBecomeValidGroup(regularTiles, jokers.length);
    }

    // For runs, check if tiles form a REASONABLE sequence
    const minNum = numbers[0];
    const maxNum = numbers[numbers.length - 1];
    const span = maxNum - minNum + 1;

    console.log(`Min: ${minNum}, Max: ${maxNum}, Span: ${span}, Regular tiles: ${regularTiles.length}`);

    // Span can't exceed 13 (max run length)
    if (span > 13) {
      console.log('✗ Span exceeds 13');
      return false;
    }

    // Calculate how many gaps need to be filled
    let gapsNeeded = 0;
    for (let i = 1; i < numbers.length; i++) {
      const gap = numbers[i] - numbers[i - 1] - 1;
      gapsNeeded += gap;
      console.log(`Gap between ${numbers[i - 1]} and ${numbers[i]}: ${gap}`);
    }

    console.log(`Gaps needed: ${gapsNeeded}, Jokers available: ${jokers.length}`);

    // Check if we have enough jokers to fill gaps
    if (gapsNeeded > jokers.length) {
      console.log('✗ Not enough jokers to fill gaps');
      return false;
    }

    // For work-in-progress, allow reasonable gaps
    for (let i = 1; i < numbers.length; i++) {
      const gap = numbers[i] - numbers[i - 1];

      // With jokers, we can fill gaps, but still need to be reasonable
      // Without enough jokers, gap should be ≤ 2
      const maxAllowedGap = jokers.length >= (gap - 1) ? gap : 2;

      if (gap > maxAllowedGap) {
        console.log('✗ Gap too large even with jokers');
        return false;
      }
    }

    console.log('✓ Could become valid run with jokers');
    return true;
  }

  // Check if it could become a valid group
  console.log('Different colors, checking if group...');
  return canBecomeValidGroup(regularTiles, jokers.length);
}

function canBecomeValidGroup(tiles: any[], jokerCount: number = 0): boolean {
  if (tiles.length === 0) return jokerCount >= 3 && jokerCount <= 4; // All jokers need to be complete

  // All same number
  const allSameNumber = tiles.every(t => t.number === tiles[0].number && !t.isJoker);
  if (!allSameNumber) {
    return false;
  }

  // Check for duplicate colors (can't have same color twice in a group)
  const colors = tiles.map(t => t.color);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size !== colors.length) {
    return false; // Duplicate colors - impossible
  }

  // Check if total tiles would be valid (3-4 tiles max)
  const totalTiles = tiles.length + jokerCount;
  if (totalTiles > 4) {
    return false;
  }

  // Check if we have room for jokers (4 colors total)
  const colorsAvailable = 4 - uniqueColors.size;
  if (jokerCount > colorsAvailable) {
    return false;
  }

  return true;
}

// Draw tile
app.post('/api/games/:gameId/draw', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { playerId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Check if pool is empty
  if (game.pool.length === 0) {
    console.log('❌ Pool is empty, cannot draw');
    return res.status(400).json({ error: 'No tiles left in pool' });
  }

  // Check if any actions taken this turn (can't draw after placing/moving)
  if (game.actionHistory.length > 0) {
    return res.status(400).json({ error: 'Cannot draw after placing or moving tiles' });
  }

  // VALIDATE BOARD STATE BEFORE DRAWING (same as end turn validation)
  if (game.board.length > 0) {
    const allTilesInValidMelds = game.board.every(tile => {
      const tilesInSameSet = game.board.filter(t => t.setId === tile.setId);
      return tilesInSameSet.length >= 3 && (isValidRun(tilesInSameSet) || isValidGroup(tilesInSameSet));
    });

    if (!allTilesInValidMelds) {
      console.log('❌ Cannot draw - board must have all valid melds');
      return res.status(400).json({ error: 'Board has incomplete melds. Fix them or undo your turn before drawing.' });
    }
  }

  // All validation passed - proceed with draw
  const drawnTile = game.pool.shift();
  game.playerHands[playerId].push(drawnTile);

  // Drawing a tile automatically ends the turn
  game.turnStartBoard = [...game.board];
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  game.actionHistory = [];
  game.hasDrawnThisTurn = false;
  game.turnEndTime = Date.now() + (TURN_TIME_SECONDS * 1000); // Set new turn timer

  games.set(gameId, game);

  console.log(`🎴 Player ${playerId} drew a tile`);
  console.log(`🔄 Turn automatically ended, now player ${game.currentPlayerIndex}'s turn`);

  // Broadcast turn change
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    canDraw: true,
    canEndTurn: false,
    turnEndTime: game.turnEndTime,
  });

  res.json({ tile: drawnTile });
});

function validateBoard(melds: any[][]) {
  if (melds.length === 0) return true; // Empty board is valid

  // Filter out single tiles (not complete melds)
  const completeMelds = melds.filter(meld => meld.length >= 3);

  // If there are tiles on board but no complete melds, invalid
  if (completeMelds.length === 0 && melds.some(m => m.length > 0)) {
    return false;
  }

  // Check each complete meld
  return completeMelds.every(meld => {
    return isValidRun(meld) || isValidGroup(meld);
  });
}

// Check if board is in a valid state for ending turn
function isBoardValidForEndTurn(game: ServerGameState, playerId: string): boolean {
  const currentPlayer = game.players.find((p: any) => p.id === playerId);

  // Check if player has placed any tiles from hand this turn
  const tilesPlacedFromHand = game.actionHistory.filter((action: TurnAction) => action.type === 'place' && action.fromHand);
  const hasPlacedTilesFromHand = tilesPlacedFromHand.length > 0;

  // If player hasn't completed initial meld yet, they cannot end turn without placing valid tiles
  if (currentPlayer && !currentPlayer.hasPlayedInitial) {
    // Must place tiles from hand to complete initial meld
    if (!hasPlacedTilesFromHand) {
      return false;
    }

    // If tiles were placed, validate initial meld requirement
    const initialMeldCheck = validateInitialMeld(game.board, playerId, game);
    return initialMeldCheck.valid;
  }

  // Player has completed initial meld - they must either:
  // 1. Place at least one tile from hand, OR
  // 2. Draw a tile (which auto-ends turn)

  // In Rummikub, you cannot simply "pass" your turn without playing or drawing
  // If no tiles were placed from hand, player must draw
  if (!hasPlacedTilesFromHand) {
    return false; // Must draw tile or place tiles from hand
  }

  // Player placed tiles from hand - validate board state
  console.log(`🔍 Validating board state for end turn...`);

  // Empty board shouldn't happen if tiles were placed, but handle it
  if (game.board.length === 0) {
    console.log(`❌ Board is empty`);
    return false;
  }

  // Group tiles into melds
  const meldGroups = groupTilesIntoMelds(game.board);
  const completeMelds = meldGroups.filter(meld => meld.length >= 3);

  console.log(`📋 Found ${completeMelds.length} complete melds`);
  completeMelds.forEach((meld, idx) => {
    const isRun = isValidRun(meld);
    const isGroup = isValidGroup(meld);
    console.log(`  Meld ${idx + 1}: [${meld.map(t => t.isJoker ? 'JOKER' : `${t.number}-${t.color}`).join(', ')}] - Run: ${isRun}, Group: ${isGroup}`);
  });

  // Check all complete melds are valid
  const allValid = completeMelds.every(meld => {
    const isRun = isValidRun(meld, true);  // Enable debug logging
    const isGroup = isValidGroup(meld, true);  // Enable debug logging
    const isValid = isRun || isGroup;

    if (!isValid) {
      console.log(`  ❌ INVALID MELD: [${meld.map(t => t.isJoker ? 'JOKER' : `${t.number}-${t.color}`).join(', ')}] - Not a valid run or group`);
    }

    return isValid;
  });

  if (!allValid) {
    console.log(`❌ Not all melds are valid`);
    return false;
  }

  // Check that all tiles are part of a complete meld (no incomplete melds)
  // Count how many tiles are in complete melds
  const tilesInCompleteMelds = completeMelds.reduce((count, meld) => count + meld.length, 0);

  if (tilesInCompleteMelds !== game.board.length) {
    console.log(`❌ Some tiles are not in complete melds (${tilesInCompleteMelds} in melds vs ${game.board.length} total)`);
    return false;
  }

  console.log(`✅ All ${game.board.length} tiles are in valid melds`);
  return true;
}

function isValidRun(tiles: any[], debug = false) {
  if (tiles.length < 3) {
    if (debug) console.log(`    ❌ Run check: Too few tiles (${tiles.length} < 3)`);
    return false;
  }

  const jokers = tiles.filter(t => t.isJoker);
  const regularTiles = tiles.filter(t => !t.isJoker);

  // If only jokers, valid if reasonable size
  if (regularTiles.length === 0) {
    const isValid = jokers.length >= 3 && jokers.length <= 13;
    if (debug) console.log(`    ${isValid ? '✓' : '❌'} Run check: All jokers (${jokers.length} tiles)`);
    return isValid;
  }

  // All regular tiles must be same color
  const color = regularTiles[0].color;
  if (!color || regularTiles.some(t => t.color !== color)) {
    if (debug) console.log(`    ❌ Run check: Not all same color (expected ${color})`);
    return false;
  }

  // Check if tiles have position information for visual order validation
  const hasPositions = tiles.every(t => t.position && typeof t.position.x === 'number');

  if (hasPositions) {
    // Sort tiles by visual position (left to right)
    const byVisualOrder = [...tiles].sort((a, b) => a.position.x - b.position.x);

    // Extract regular tile numbers in visual order
    const regularTilesInVisualOrder = byVisualOrder.filter(t => !t.isJoker);
    const numbersInVisualOrder = regularTilesInVisualOrder.map(t => t.number);

    // Check that regular tiles are in ascending numeric order visually
    for (let i = 1; i < numbersInVisualOrder.length; i++) {
      if (numbersInVisualOrder[i] <= numbersInVisualOrder[i - 1]) {
        if (debug) {
          console.log(`    ❌ Run check: Tiles not in ascending visual order [${numbersInVisualOrder.join(', ')}]`);
        }
        return false;
      }
    }
  }

  // Check if numbers with jokers form a valid run
  const numbers = regularTiles.map(t => t.number).sort((a, b) => a - b);

  // No duplicates allowed in regular tiles
  const uniqueNumbers = new Set(numbers);
  if (uniqueNumbers.size !== numbers.length) {
    if (debug) console.log(`    ❌ Run check: Has duplicate numbers [${numbers.join(', ')}]`);
    return false;
  }

  // Calculate gaps between regular tiles
  const minNum = numbers[0];
  const maxNum = numbers[numbers.length - 1];
  const spanOfRegularTiles = maxNum - minNum + 1;

  // Count how many gaps exist between regular tiles
  let gapsInRegularTiles = spanOfRegularTiles - regularTiles.length;

  // Jokers can fill gaps OR extend on either end
  // Total tiles = regular tiles + jokers
  // The sequence must be valid: jokers should either fill gaps or extend the sequence

  // Check if we have enough jokers to fill the gaps
  if (jokers.length < gapsInRegularTiles) {
    // Not enough jokers to fill gaps between regular tiles
    if (debug) {
      console.log(`    ❌ Run check: Not enough jokers (${jokers.length}) to fill gaps (${gapsInRegularTiles}) between regular tiles`);
    }
    return false;
  }

  // Jokers that fill gaps
  const jokersFillingGaps = gapsInRegularTiles;
  // Remaining jokers extend the sequence
  const jokersExtending = jokers.length - jokersFillingGaps;

  // Total sequence length = regular tiles + jokers
  const totalSequenceLength = regularTiles.length + jokers.length;

  // Sequence length can't exceed 13
  if (totalSequenceLength > 13) {
    if (debug) {
      console.log(`    ❌ Run check: Total sequence length (${totalSequenceLength}) exceeds 13`);
    }
    return false;
  }

  // Check that extending doesn't go below 1 or above 13
  // We need to check all possible ways to distribute the extending jokers
  // The most restrictive case is when all jokers extend in one direction
  const minPossibleStart = minNum - jokersExtending;
  const maxPossibleEnd = maxNum + jokersExtending;

  // At least one valid configuration must exist:
  // Either: extend left only, extend right only, or split between both
  const canExtendLeft = minPossibleStart >= 1;
  const canExtendRight = maxPossibleEnd <= 13;
  const canSplit = (minNum - Math.floor(jokersExtending / 2)) >= 1 && (maxNum + Math.ceil(jokersExtending / 2)) <= 13;

  if (!canExtendLeft && !canExtendRight && !canSplit) {
    if (debug) {
      console.log(`    ❌ Run check: No valid extension possible. Min possible: ${minPossibleStart}, Max possible: ${maxPossibleEnd}`);
    }
    return false;
  }

  if (debug) {
    console.log(`    ✓ Run check: ${tiles.length} tiles, regular span ${spanOfRegularTiles} (${minNum}-${maxNum}), ${gapsInRegularTiles} gaps, ${jokers.length} jokers (${jokersFillingGaps} filling gaps, ${jokersExtending} extending)`);
  }
  return true;
}

function isValidGroup(tiles: any[], debug = false) {
  if (tiles.length < 3 || tiles.length > 4) {
    if (debug) console.log(`    ❌ Group check: Invalid tile count (${tiles.length}, need 3-4)`);
    return false;
  }

  const jokers = tiles.filter(t => t.isJoker);
  const regularTiles = tiles.filter(t => !t.isJoker);

  // If only jokers, valid if 3-4 jokers
  if (regularTiles.length === 0) {
    const isValid = jokers.length >= 3 && jokers.length <= 4;
    if (debug) console.log(`    ${isValid ? '✓' : '❌'} Group check: All jokers (${jokers.length} tiles)`);
    return isValid;
  }

  // All regular tiles must be same number
  const number = regularTiles[0].number;
  if (regularTiles.some(t => t.number !== number)) {
    if (debug) console.log(`    ❌ Group check: Not all same number (expected ${number})`);
    return false;
  }

  // All regular tiles must have different colors
  const colors = regularTiles.map(t => t.color);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size !== colors.length) {
    if (debug) console.log(`    ❌ Group check: Has duplicate colors [${colors.join(', ')}]`);
    return false;
  }

  // Check total tiles don't exceed 4 (max colors)
  if (tiles.length > 4) {
    if (debug) console.log(`    ❌ Group check: Too many tiles (${tiles.length} > 4)`);
    return false;
  }

  if (debug) console.log(`    ✓ Group check: Valid group of ${number}s with ${jokers.length} jokers`);
  return true;
}

// Helper function to check win condition
function checkWinCondition(game: ServerGameState, playerId: string) {
  const hand = game.playerHands[playerId];
  if (hand && hand.length === 0) {
    // Validate board is legal
    const meldGroups = groupTilesIntoMelds(game.board);
    const completeMelds = meldGroups.filter(meld => meld.length >= 3);
    const allValid = completeMelds.every(meld => isValidRun(meld) || isValidGroup(meld));

    return allValid;
  }
  return false;
}

// End turn
app.post('/api/games/:gameId/endturn', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { playerId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const currentPlayer = game.players[game.currentPlayerIndex];

  if (playerId && currentPlayer.id !== playerId) {
    return res.status(403).json({ error: 'Not your turn' });
  }

  // ALWAYS validate board state, even if just drawing
  const meldGroups = groupTilesIntoMelds(game.board);
  const completeMelds = meldGroups.filter(meld => meld.length >= 3);

  // Check all complete melds are valid
  const allValid = completeMelds.every(meld => isValidRun(meld) || isValidGroup(meld));

  if (!allValid) {
    console.log('❌ Invalid board configuration');
    return res.status(400).json({ error: 'Invalid board configuration - fix melds before ending turn' });
  }

  // Check for incomplete melds (tiles that aren't in valid 3+ tile melds)
  const allTilesInValidMelds = game.board.every(tile => {
    const tilesInSameSet = game.board.filter(t => t.setId === tile.setId);
    return tilesInSameSet.length >= 3 && (isValidRun(tilesInSameSet) || isValidGroup(tilesInSameSet));
  });

  if (!allValid || !allTilesInValidMelds) {
    console.log('❌ Board has incomplete or invalid melds');
    return res.status(400).json({ error: 'All tiles must be in valid melds of 3+ tiles' });
  }

  // Check initial meld requirement (only if player hasn't completed it yet)
  if (!currentPlayer.hasPlayedInitial && game.actionHistory.length > 0) {
    const initialMeldCheck = validateInitialMeld(game.board, currentPlayer.id, game);

    if (!initialMeldCheck.valid) {
      console.log(`❌ Initial meld check failed: ${initialMeldCheck.message}`);
      return res.status(400).json({
        error: initialMeldCheck.message,
        totalValue: initialMeldCheck.totalValue
      });
    }

    // Mark player as having completed initial meld
    currentPlayer.hasPlayedInitial = true;
    console.log(`✅ Player ${currentPlayer.username} completed initial meld (${initialMeldCheck.totalValue} points)`);
  }

  // Check for win condition - player has no tiles left
  if (game.playerHands[currentPlayer.id]?.length === 0) {
    console.log(`🎉 Player ${currentPlayer.username} wins! No tiles remaining.`);
    game.phase = 'ended';

    // Broadcast game end
    io.to(gameId).emit('game-state-update', {
      phase: game.phase,
      winner: currentPlayer,
      players: game.players.map((p: any) => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        tilesCount: game.playerHands[p.id]?.length || 0,
        hasPlayedInitial: p.hasPlayedInitial,
        isReady: p.isReady,
      })),
      currentPlayerIndex: game.currentPlayerIndex,
      board: game.board,
      poolSize: game.pool.length,
    });

    return res.json({ success: true, winner: currentPlayer });
  }

  game.turnStartBoard = [...game.board];
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  game.actionHistory = []; // Clear action history for next turn
  game.hasDrawnThisTurn = false; // Reset draw flag
  game.turnEndTime = Date.now() + (TURN_TIME_SECONDS * 1000); // Set new turn timer
  games.set(gameId, game);

  console.log(`🔄 Turn ended, now player ${game.players[game.currentPlayerIndex].username}'s turn`);

  // Broadcast turn change
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    canDraw: game.pool.length > 0,
    canEndTurn: false,
    turnEndTime: game.turnEndTime,
  });

  res.json({ success: true, nextPlayerIndex: game.currentPlayerIndex });
});

// Undo turn
app.post('/api/games/:gameId/undo', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { playerId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Find tiles placed this turn
  const tilesPlacedThisTurn = game.board.filter(
    boardTile => !game.turnStartBoard.find((t: any) => t.id === boardTile.id)
  );

  // Return tiles to player's hand
  game.playerHands[playerId].push(...tilesPlacedThisTurn);
  game.board = [...game.turnStartBoard];
  game.actionHistory = [];
  games.set(gameId, game);

  console.log(`↩️ Player ${playerId} undid their turn`);
  console.log(`📋 Action history cleared: ${game.actionHistory.length} actions`);

  // Broadcast undo
  const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    canDraw: game.actionHistory.length === 0,
    canUndo: game.actionHistory.length > 0,
    canEndTurn: isBoardValidForEndTurn(game, currentPlayerId),
    turnEndTime: game.turnEndTime,
  });

  res.json({ success: true, restoredTiles: tilesPlacedThisTurn });
});

// Undo last action
app.post('/api/games/:gameId/undolast', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { playerId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.actionHistory.length === 0) {
    return res.status(400).json({ error: 'No actions to undo' });
  }

  // Get last action
  const lastAction = game.actionHistory.pop()!;

  console.log(`↩️ Undoing last action:`, lastAction);

  if (lastAction.type === 'place' && lastAction.fromHand) {
    // Remove tile from board and return to hand
    game.board = game.board.filter(t => t.id !== lastAction.tile.id);
    game.playerHands[playerId].push({
      id: lastAction.tile.id,
      number: lastAction.tile.number,
      color: lastAction.tile.color,
      isJoker: lastAction.tile.isJoker
    });

    console.log(`Removed tile from board, returned to hand`);
  } else if (lastAction.type === 'move') {
    // Move tile back to original position
    const tileIndex = game.board.findIndex(t => t.id === lastAction.tile.id);
    if (tileIndex !== -1) {
      game.board[tileIndex] = {
        ...game.board[tileIndex],
        position: lastAction.fromPosition!,
        setId: lastAction.oldSetId!
      };
      console.log(`Moved tile back to original position`);
    }
  }

  games.set(gameId, game);

  // Broadcast undo
  const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      tilesCount: game.playerHands[p.id]?.length || 0,
      hasPlayedInitial: p.hasPlayedInitial,
      isReady: p.isReady,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    canDraw: game.actionHistory.length === 0,
    canUndo: game.actionHistory.length > 0,
    canEndTurn: isBoardValidForEndTurn(game, currentPlayerId),
    turnEndTime: game.turnEndTime,
  });

  res.json({ success: true, undoneAction: lastAction });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  console.log('Transport:', socket.conn.transport.name);

  // Join a game room (based on Discord channel ID)
  socket.on('join-room', (channelId: string) => {
    socket.join(channelId);
    console.log(`Socket ${socket.id} joined room ${channelId}`);
  });

  // Monitor transport upgrades
  socket.conn.on("upgrade", () => {
    console.log("Transport upgraded to:", socket.conn.transport.name);
  });

  // Legacy broadcast (keeping for compatibility)
  socket.on('game-state-update', (data: { channelId: string; gameState: any }) => {
    console.log('Broadcasting game state to room:', data.channelId);
    socket.to(data.channelId).emit('game-state-update', data.gameState);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server starting on port: ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;