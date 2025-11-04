import React from 'react';
import { Tile } from './Tile';
import { Tile as TileType } from '../types/game';
import { sortHand } from '../game/logic';

interface PlayerHandProps {
  tiles: TileType[];
  onTileClick?: (tile: TileType) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ tiles, onTileClick }) => {
  const sortedTiles = sortHand(tiles);

  return (
    <div className="w-full bg-gradient-to-b from-rummikub-rack to-amber-900 p-4 rounded-t-xl shadow-2xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-bold text-lg">Your Hand</h3>
        <span className="text-amber-200 text-sm">{tiles.length} tiles</span>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center min-h-[100px] p-2 bg-black/20 rounded-lg">
        {sortedTiles.length === 0 ? (
          <div className="text-amber-200 text-center py-8 w-full">
            No tiles in hand
          </div>
        ) : (
          sortedTiles.map((tile) => (
            <Tile
              key={tile.id}
              tile={tile}
              // onTileClick={() => onTileClick?.(tile)}
              isDraggable={true}
            />
          ))
        )}
      </div>
    </div>
  );
};
