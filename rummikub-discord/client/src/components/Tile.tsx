import React from 'react';
import { useDrag } from 'react-dnd';
import { Tile as TileType } from '../types/game';

interface TileProps {
  tile: TileType;
  size?: 'small' | 'medium' | 'large';
  isDraggable?: boolean;
  fromBoard?: boolean; // New prop to indicate if tile is on board
}

export const Tile: React.FC<TileProps> = ({
  tile,
  size = 'medium',
  isDraggable = true,
  fromBoard = false
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'tile',
    item: {
      tile,
      fromBoard  // Include this in the drag data
    },
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [tile, isDraggable, fromBoard]);

  const sizeClasses = {
    small: 'w-12 h-16 text-sm',
    medium: 'w-16 h-20 text-xl',
    large: 'w-20 h-24 text-2xl',
  };

  const colorClasses = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    black: 'text-black',
  };

  if (tile.isJoker) {
    return (
      <div
        ref={drag}
        className={`${sizeClasses[size]} bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-lg flex items-center justify-center font-bold cursor-move ${isDragging ? 'opacity-50' : 'opacity-100'
          }`}
      >
        <span className="text-white">🃏</span>
      </div>
    );
  }

  return (
    <div
      ref={drag}
      className={`${sizeClasses[size]} bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-lg flex items-center justify-center font-bold border-2 border-amber-200 cursor-move ${isDragging ? 'opacity-50' : 'opacity-100'
        }`}
    >
      <span className={colorClasses[tile.color || 'black']}>{tile.number}</span>
    </div>
  );
};