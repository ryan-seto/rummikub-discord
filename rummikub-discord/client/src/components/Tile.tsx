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
    small: 'w-12 h-16 text-base',
    medium: 'w-16 h-20 text-3xl',
    large: 'w-20 h-24 text-4xl',
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
        className={`${sizeClasses[size]} bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-lg border-2 border-amber-200 cursor-move relative ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{
            fontSize: '48px',
            lineHeight: '1',
            display: 'block',
            transform: 'translateY(-1px)'  // ← Fine-tune positioning
          }}>🃏</span>
        </div>
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