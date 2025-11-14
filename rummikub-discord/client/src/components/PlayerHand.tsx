import React, { useState, useEffect, useRef } from 'react';
import { Tile } from './Tile';
import { Tile as TileType } from '../types/game';
import { sortHandByColor, sortHandByNumber } from '../game/logic';

interface PlayerHandProps {
  tiles: TileType[];
  onTileClick?: (tile: TileType) => void;
}

type SortMode = 'color' | 'number';

export const PlayerHand: React.FC<PlayerHandProps> = ({ tiles, onTileClick }) => {
  const [sortMode, setSortMode] = useState<SortMode>('color');
  const [newTileIds, setNewTileIds] = useState<Set<string>>(new Set());
  const previousTileCount = useRef(tiles.length);

  // Detect newly added tiles
  useEffect(() => {
    if (tiles.length > previousTileCount.current) {
      // Find the new tile(s) by comparing with previous tiles
      const previousIds = new Set(tiles.slice(0, previousTileCount.current).map(t => t.id));
      const newIds = tiles.filter(t => !previousIds.has(t.id)).map(t => t.id);

      setNewTileIds(new Set(newIds));

      // Remove the highlight after animation completes
      const timer = setTimeout(() => {
        setNewTileIds(new Set());
      }, 2000);

      return () => clearTimeout(timer);
    }
    previousTileCount.current = tiles.length;
  }, [tiles]);

  const sortedTiles = sortMode === 'color'
    ? sortHandByColor(tiles)
    : sortHandByNumber(tiles);

  return (
    <div className="bg-amber-900 rounded-xl shadow-2xl" style={{ width: '1173px', flexShrink: 0 }}>
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-amber-800">
        <span className="text-amber-200 text-sm font-semibold">Your Hand</span>
        <div className="flex gap-1">
          <button
            onClick={() => setSortMode('color')}
            className={`
              px-2 py-1 rounded text-xs font-semibold transition-all
              ${sortMode === 'color'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-800 text-amber-300 hover:bg-amber-750'
              }
            `}
          >
            Color
          </button>
          <button
            onClick={() => setSortMode('number')}
            className={`
              px-2 py-1 rounded text-xs font-semibold transition-all
              ${sortMode === 'number'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-800 text-amber-300 hover:bg-amber-750'
              }
            `}
          >
            Number
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center px-4 py-3" style={{ minHeight: '136px', maxHeight: '136px' }}>
        {sortedTiles.length === 0 ? (
          <div className="text-amber-200 text-center py-4 w-full text-sm">
            No tiles
          </div>
        ) : (
          sortedTiles.map((tile) => (
            <div
              key={tile.id}
              className={`${newTileIds.has(tile.id) ? 'animate-new-tile' : ''}`}
            >
              <Tile
                tile={tile}
                isDraggable={true}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
