import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Tile } from './Tile';
import { Tile as TileType } from '../types/game';
import { sortHandByColor, sortHandByNumber } from '../game/logic';

interface PlayerHandProps {
  tiles: TileType[];
  onTileClick?: (tile: TileType) => void;
  highlightTileId?: string | null;
}

export type SortMode = 'color' | 'number';

export interface PlayerHandRef {
  getSortMode: () => SortMode;
  getContainerElement: () => HTMLDivElement | null;
}

export const PlayerHand = forwardRef<PlayerHandRef, PlayerHandProps>(({ tiles, onTileClick, highlightTileId }, ref) => {
  const [sortMode, setSortMode] = useState<SortMode>('color');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getSortMode: () => sortMode,
    getContainerElement: () => containerRef.current,
  }));

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
      <div ref={containerRef} className="flex flex-wrap gap-1.5 justify-center px-4 py-3" style={{ minHeight: '136px', maxHeight: '136px' }}>
        {sortedTiles.length === 0 ? (
          <div className="text-amber-200 text-center py-4 w-full text-sm">
            No tiles
          </div>
        ) : (
          sortedTiles.map((tile) => (
            <Tile
              key={tile.id}
              tile={tile}
              isDraggable={true}
              isHighlighted={highlightTileId === tile.id}
            />
          ))
        )}
      </div>
    </div>
  );
});
