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
    <div className="w-full bg-amber-900 p-2 rounded-t-lg shadow-2xl">
      <div className="flex flex-wrap gap-1.5 justify-center max-h-[140px] overflow-y-auto">
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
            />
          ))
        )}
      </div>
    </div>
  );
};
