import { Tile, TileColor, Meld, MeldType, ValidatedMeld } from '../types/game';

/**
 * Creates a full set of Rummikub tiles
 * - 2 sets of tiles (1-13 in 4 colors each) = 104 tiles
 * - 2 jokers = 2 tiles
 * Total: 106 tiles
 */
export function createTileSet(): Tile[] {
  const tiles: Tile[] = [];
  let idCounter = 0;

  // Create two sets of numbered tiles
  for (let set = 0; set < 2; set++) {
    for (const color of Object.values(TileColor)) {
      for (let number = 1; number <= 13; number++) {
        tiles.push({
          id: `tile-${idCounter++}`,
          number,
          color,
          isJoker: false,
        });
      }
    }
  }

  // Add 2 jokers
  for (let i = 0; i < 2; i++) {
    tiles.push({
      id: `joker-${i}`,
      number: 0,
      color: null,
      isJoker: true,
    });
  }

  return tiles;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Validates if a meld is a valid run (same color, consecutive numbers)
 */
function isValidRun(tiles: Tile[]): boolean {
  if (tiles.length < 3) return false;

  // Sort tiles by number (treating jokers separately)
  const sorted = [...tiles].sort((a, b) => {
    if (a.isJoker) return 1;
    if (b.isJoker) return -1;
    return a.number - b.number;
  });

  // Check if all non-joker tiles are the same color
  const colors = sorted.filter(t => !t.isJoker).map(t => t.color);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size > 1) return false;

  // Check if numbers are consecutive (accounting for jokers)
  let expectedNumber = sorted[0].isJoker ? 1 : sorted[0].number;
  let jokersUsed = 0;

  for (let i = 0; i < sorted.length; i++) {
    const tile = sorted[i];
    
    if (tile.isJoker) {
      jokersUsed++;
      expectedNumber++;
      continue;
    }

    if (tile.number !== expectedNumber) {
      // Try to fill gap with jokers
      const gap = tile.number - expectedNumber;
      if (gap > jokersUsed) return false;
      jokersUsed -= gap;
      expectedNumber = tile.number;
    }
    
    expectedNumber++;
  }

  // Numbers must be between 1-13
  const maxNumber = sorted[sorted.length - 1].isJoker 
    ? expectedNumber - 1 
    : sorted[sorted.length - 1].number;
  
  return maxNumber <= 13;
}

/**
 * Validates if a meld is a valid group (same number, different colors)
 */
function isValidGroup(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false;

  // Get the number (from first non-joker tile)
  const targetNumber = tiles.find(t => !t.isJoker)?.number;
  if (!targetNumber) return false; // All jokers is invalid

  // Check all non-joker tiles have the same number
  const numbersMatch = tiles
    .filter(t => !t.isJoker)
    .every(t => t.number === targetNumber);
  
  if (!numbersMatch) return false;

  // Check all non-joker tiles have different colors
  const colors = tiles.filter(t => !t.isJoker).map(t => t.color);
  const uniqueColors = new Set(colors);
  
  return uniqueColors.size === colors.length;
}

/**
 * Validates a meld and returns its type and points
 */
export function validateMeld(tiles: Tile[]): ValidatedMeld {
  if (tiles.length < 3) {
    return {
      tiles,
      type: MeldType.RUN,
      isValid: false,
      points: 0,
    };
  }

  const isRun = isValidRun(tiles);
  const isGroup = isValidGroup(tiles);

  if (!isRun && !isGroup) {
    return {
      tiles,
      type: MeldType.RUN,
      isValid: false,
      points: 0,
    };
  }

  // Calculate points (jokers count as 30)
  const points = tiles.reduce((sum, tile) => {
    return sum + (tile.isJoker ? 30 : tile.number);
  }, 0);

  return {
    tiles,
    type: isRun ? MeldType.RUN : MeldType.GROUP,
    isValid: true,
    points,
  };
}

/**
 * Validates if a player's initial meld meets the 30-point requirement
 */
export function validateInitialMeld(melds: Meld[]): boolean {
  const totalPoints = melds.reduce((sum, meld) => {
    const validated = validateMeld(meld);
    return sum + (validated.isValid ? validated.points : 0);
  }, 0);

  return totalPoints >= 30;
}

/**
 * Validates the entire board state
 */
export function validateBoard(melds: Meld[]): boolean {
  return melds.every(meld => validateMeld(meld).isValid);
}

/**
 * Calculates a player's hand value (for end of game scoring)
 */
export function calculateHandValue(tiles: Tile[]): number {
  return tiles.reduce((sum, tile) => {
    return sum + (tile.isJoker ? 30 : tile.number);
  }, 0);
}

/**
 * Sorts tiles in a player's hand for easier viewing
 */
export function sortHandByColor(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    // Jokers go to the end
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return 0;

    // Sort by color, then by number
    const colorOrder = [TileColor.RED, TileColor.BLUE, TileColor.YELLOW, TileColor.BLACK];
    const colorCompare = colorOrder.indexOf(a.color!) - colorOrder.indexOf(b.color!);

    if (colorCompare !== 0) return colorCompare;
    return a.number - b.number;
  });
}

export function sortHandByNumber(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    // Jokers go to the end
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return 0;

    // Sort by number, then by color
    if (a.number !== b.number) return a.number - b.number;

    const colorOrder = [TileColor.RED, TileColor.BLUE, TileColor.YELLOW, TileColor.BLACK];
    return colorOrder.indexOf(a.color!) - colorOrder.indexOf(b.color!);
  });
}

// Default sorting (by color)
export function sortHand(tiles: Tile[]): Tile[] {
  return sortHandByColor(tiles);
}
