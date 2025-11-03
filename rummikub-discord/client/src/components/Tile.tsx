import React from 'react';
import { useDrag } from 'react-dnd';
import { Tile as TileType, TileColor } from '../types/game';

interface TileProps {
  tile: TileType;
  onTileClick?: () => void;
  className?: string;
  draggable?: boolean;
}

const TILE_COLORS: Record<TileColor, string> = {
  [TileColor.RED]: 'text-rummikub-red',
  [TileColor.BLUE]: 'text-rummikub-blue',
  [TileColor.YELLOW]: 'text-rummikub-yellow',
  [TileColor.BLACK]: 'text-rummikub-black',
};

export const Tile: React.FC<TileProps> = ({ 
  tile, 
  onTileClick, 
  className = '',
  draggable = true 
}) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'TILE',
      item: tile,
      canDrag: draggable,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [tile, draggable]
  );

  const colorClass = tile.color ? TILE_COLORS[tile.color] : 'text-purple-600';

  return (
    <div
      ref={draggable ? drag : null}
      onClick={onTileClick}
      className={`
        relative w-12 h-16 sm:w-14 sm:h-20 
        bg-gradient-to-br from-amber-50 to-amber-100
        border-2 border-amber-900
        rounded-lg shadow-md
        flex items-center justify-center
        font-bold text-2xl sm:text-3xl
        cursor-pointer
        transition-all duration-200
        hover:scale-105 hover:shadow-lg
        active:scale-95
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${className}
      `}
      style={{
        touchAction: 'none',
      }}
    >
      {tile.isJoker ? (
        <div className="flex flex-col items-center">
          <span className="text-lg sm:text-xl">🃏</span>
          <span className="text-xs text-gray-600">Joker</span>
        </div>
      ) : (
        <span className={colorClass}>{tile.number}</span>
      )}
      
      {/* Corner decoration */}
      <div className="absolute top-1 left-1 text-xs opacity-50">
        {tile.isJoker ? '★' : tile.number}
      </div>
    </div>
  );
};
