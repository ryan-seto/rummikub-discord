import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth token exchange endpoint
app.post('/api/token', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.VITE_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing Discord credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const data = await response.json() as { access_token?: string; error?: string };

    if (!response.ok) {
      console.error('Discord OAuth error:', data);
      return res.status(response.status).json({ error: 'Failed to exchange token', details: data });
    }

    res.json({ access_token: data.access_token });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
}

const games = new Map<string, ServerGameState>();

// Helper functions
function createTilePool() {
  const tiles = [];
  const colors = ['red', 'blue', 'yellow', 'black'];
  let id = 0;

  // Create 2 sets of 1-13 in each color
  for (let set = 0; set < 2; set++) {
    for (const color of colors) {
      for (let num = 1; num <= 13; num++) {
        tiles.push({
          id: `tile-${id++}`,
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

// Initialize a new game
app.post('/api/games/init', (req, res) => {
  const { channelId, players } = req.body;

  if (!channelId || !players || players.length < 2) {
    return res.status(400).json({ error: 'Invalid game initialization' });
  }

  const gameId = channelId;

  // Create and shuffle tiles
  const allTiles = createTilePool();
  const shuffled = shuffleTiles(allTiles);

  // Deal 14 tiles to each player
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
      isReady: true,
    })),
    currentPlayerIndex: 0,
    board: [],
    pool,
    turnStartBoard: [],
    playerHands,
  };

  games.set(gameId, gameState);

  console.log(`🎮 Game initialized for channel ${channelId} with ${players.length} players`);
  res.json({ success: true, gameId });
});

// Get player's private hand
app.get('/api/games/:gameId/hand/:playerId', (req, res) => {
  const { gameId, playerId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const hand = game.playerHands[playerId] || [];
  res.json({ hand });
});

// Get public game state (no hands)
app.get('/api/games/:gameId/state', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Send public state only
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

// Start game
app.post('/api/games/:gameId/start', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  game.phase = 'playing';
  games.set(gameId, game);

  console.log(`🎮 Game ${gameId} started`);

  // Broadcast to all clients in this game
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players,
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
  });

  res.json({ success: true });
});

// Place tile
app.post('/api/games/:gameId/place', (req, res) => {
  const { gameId } = req.params;
  const { playerId, tile, position, setId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Check if position is already occupied (exact grid match)
  const existingTileAtPosition = game.board.find(
    t => t.position.x === position.x && t.position.y === position.y
  );

  if (existingTileAtPosition) {
    console.log('❌ Position already occupied');
    return res.status(400).json({ error: 'Position already occupied' });
  }

  // Remove from hand
  const hand = game.playerHands[playerId];
  if (!hand) {
    return res.status(400).json({ error: 'Player not found' });
  }

  game.playerHands[playerId] = hand.filter(t => t.id !== tile.id);

  // Add to board
  game.board.push({ ...tile, position, setId });
  games.set(gameId, game);

  console.log(`🎴 Player ${playerId} placed tile ${tile.number}-${tile.color}`);

  // Broadcast updated board
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
  });

  res.json({ success: true });
});

// Draw tile
app.post('/api/games/:gameId/draw', (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.body;
  const game = games.get(gameId);

  if (!game || game.pool.length === 0) {
    return res.status(404).json({ error: 'Cannot draw tile' });
  }

  const drawnTile = game.pool.shift();
  game.playerHands[playerId].push(drawnTile);
  games.set(gameId, game);

  console.log(`🎴 Player ${playerId} drew a tile`);

  // Broadcast updated player count
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
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

function isValidRun(tiles: any[]) {
  if (tiles.length < 3) return false;

  // All same color, no jokers in this simple version
  const color = tiles[0].color;
  if (!color || tiles.some(t => t.color !== color || t.isJoker)) return false;

  // Consecutive numbers
  const sorted = [...tiles].sort((a, b) => a.number - b.number);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number !== sorted[i - 1].number + 1) return false;
  }

  return true;
}

function isValidGroup(tiles: any[]) {
  if (tiles.length < 3 || tiles.length > 4) return false;

  // All same number, no jokers in this simple version
  const number = tiles[0].number;
  if (tiles.some(t => t.number !== number || t.isJoker)) return false;

  // All different colors
  const colors = tiles.map(t => t.color);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size !== tiles.length) return false;

  return true;
}

// End turn
app.post('/api/games/:gameId/endturn', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Validate board before ending turn
  const sets: { [setId: string]: any[] } = {};
  game.board.forEach(tile => {
    if (!sets[tile.setId]) {
      sets[tile.setId] = [];
    }
    sets[tile.setId].push(tile);
  });

  const melds = Object.values(sets);
  const isBoardValid = validateBoard(melds);

  if (!isBoardValid && game.board.length > 0) {
    console.log('❌ Invalid board configuration');
    return res.status(400).json({ error: 'Invalid board configuration' });
  }

  game.turnStartBoard = [...game.board];
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  games.set(gameId, game);

  console.log(`🔄 Turn ended, now player ${game.currentPlayerIndex}'s turn`);

  // Broadcast turn change
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
  });

  res.json({ success: true, nextPlayerIndex: game.currentPlayerIndex });
});

// Undo turn
app.post('/api/games/:gameId/undo', (req, res) => {
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
  games.set(gameId, game);

  console.log(`↩️ Player ${playerId} undid their turn`);

  // Broadcast undo
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
  });

  res.json({ success: true, restoredTiles: tilesPlacedThisTurn });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a game room (based on Discord channel ID)
  socket.on('join-room', (channelId: string) => {
    socket.join(channelId);
    console.log(`Socket ${socket.id} joined room ${channelId}`);
  });

  // Legacy broadcast (keeping for compatibility)
  socket.on('game-state-update', (data: { channelId: string; gameState: any }) => {
    console.log('Broadcasting game state to room:', data.channelId);
    socket.to(data.channelId).emit('game-state-update', data.gameState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Rummikub server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;