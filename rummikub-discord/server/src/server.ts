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
  actionHistory: TurnAction[];
  hasDrawnThisTurn: boolean;
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
    actionHistory: [],
    hasDrawnThisTurn: false, // ← Make sure this is here
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
    poolSize: game.pool.length,
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

  // Broadcast updated board
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
  });

  res.json({ success: true });
});

// Move tile on board (for rearranging)
app.post('/api/games/:gameId/move', (req, res) => {
  const { gameId } = req.params;
  const { tileId, newPosition, newSetId } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  console.log(`🔄 Moving tile ${tileId} to position:`, newPosition);

  // Find the tile on the board
  const tileIndex = game.board.findIndex(t => t.id === tileId);

  if (tileIndex === -1) {
    return res.status(404).json({ error: 'Tile not found on board' });
  }

  const tile = game.board[tileIndex];

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

  games.set(gameId, game);

  console.log(`✅ Tile ${tile.number}-${tile.color} moved to (${newPosition.x}, ${newPosition.y})`);

  // Broadcast updated board
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
  });

  res.json({ success: true });
});

// Check if tiles COULD become a valid run or group
function canBecomeValidMeld(tiles: any[]): boolean {
  console.log('🔍 Checking tiles:', tiles.map(t => `${t.number}-${t.color}`));

  // Check if it could become a valid run
  const allSameColor = tiles.every(t => t.color === tiles[0].color && !t.isJoker);

  if (allSameColor) {
    console.log('✓ All same color - checking for run...');

    const numbers = tiles.map(t => t.number).sort((a, b) => a - b);
    console.log('Numbers sorted:', numbers);

    // Check for duplicates
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      console.log('✗ Has duplicate numbers, checking if group...');
      return canBecomeValidGroup(tiles);
    }

    // For runs, check if tiles form a REASONABLE sequence
    // Calculate the span
    const minNum = numbers[0];
    const maxNum = numbers[numbers.length - 1];
    const span = maxNum - minNum + 1;

    console.log(`Min: ${minNum}, Max: ${maxNum}, Span: ${span}, Tiles: ${tiles.length}`);

    // The span tells us how many tiles would be needed total
    // For a valid work-in-progress run:
    // - Must eventually have at least 3 consecutive tiles
    // - Span can't exceed 13 (max run length)

    if (span > 13) {
      console.log('✗ Span exceeds 13');
      return false;
    }

    // Check: are the tiles reasonably close?
    // For each gap between tiles, it should be fillable
    for (let i = 1; i < numbers.length; i++) {
      const gap = numbers[i] - numbers[i - 1];
      console.log(`Gap between ${numbers[i - 1]} and ${numbers[i]}: ${gap}`);

      // A gap of 1 means consecutive (good)
      // A gap of 2 means one missing tile (could be filled)
      // A gap of 3 means two missing tiles (getting risky)
      // A gap > 3 means too many missing tiles

      // For work-in-progress, allow gaps up to 2
      if (gap > 2) {
        console.log('✗ Gap too large (> 2)');
        return false;
      }
    }

    console.log('✓ Could become valid run');
    return true;
  }

  // Check if it could become a valid group
  console.log('Different colors, checking if group...');
  return canBecomeValidGroup(tiles);
}

function canBecomeValidGroup(tiles: any[]): boolean {
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

  // Can't have more than 4 tiles (only 4 colors exist)
  if (tiles.length > 4) {
    return false;
  }

  return true;
}

// Draw tile
app.post('/api/games/:gameId/draw', (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.body;
  const game = games.get(gameId);

  if (!game || game.pool.length === 0) {
    return res.status(404).json({ error: 'Cannot draw tile' });
  }

  // Check if any actions taken this turn (can't draw after placing/moving)
  if (game.actionHistory.length > 0) {
    return res.status(400).json({ error: 'Cannot draw after placing or moving tiles' });
  }

  const drawnTile = game.pool.shift();
  game.playerHands[playerId].push(drawnTile);

  // Drawing a tile automatically ends the turn
  game.turnStartBoard = [...game.board];
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  game.actionHistory = []; // Clear for next turn
  game.hasDrawnThisTurn = false; // Reset for next player

  games.set(gameId, game);

  console.log(`🎴 Player ${playerId} drew a tile`);
  console.log(`🔄 Turn automatically ended, now player ${game.currentPlayerIndex}'s turn`);

  // Broadcast turn change after draw
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
    hasDrawnThisTurn: false,
    canDraw: true,
    canPlaceTiles: true,
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

  // Validate board before ending turn (only if no draw happened)
  if (!game.hasDrawnThisTurn) {
    const sets: { [setId: string]: any[] } = {};
    game.board.forEach(tile => {
      if (!sets[tile.setId]) {
        sets[tile.setId] = [];
      }
      sets[tile.setId].push(tile);
    });

    const melds = Object.values(sets);
    const isBoardValid = validateBoard(melds);

    if (!isBoardValid) {
      console.log('❌ Invalid board configuration');
      return res.status(400).json({ error: 'Invalid board configuration' });
    }
  }

  game.turnStartBoard = [...game.board];
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  game.actionHistory = []; // Clear action history for next turn
  game.hasDrawnThisTurn = false; // Reset draw flag
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
    poolSize: game.pool.length,
    hasDrawnThisTurn: false,
    canDraw: true,
    canPlaceTiles: true,
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
  game.actionHistory = []; // ← THIS LINE MUST BE HERE
  games.set(gameId, game);

  console.log(`↩️ Player ${playerId} undid their turn`);
  console.log(`📋 Action history cleared: ${game.actionHistory.length} actions`); // ← Add this log

  // Broadcast undo
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
  });

  res.json({ success: true, restoredTiles: tilesPlacedThisTurn });
});

// Undo last action
app.post('/api/games/:gameId/undolast', (req, res) => {
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
  io.to(gameId).emit('game-state-update', {
    phase: game.phase,
    players: game.players.map(p => ({
      ...p,
      tilesCount: game.playerHands[p.id]?.length || 0,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    board: game.board,
    poolSize: game.pool.length,
  });

  res.json({ success: true, undoneAction: lastAction });
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