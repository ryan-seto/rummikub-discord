import React from 'react';
import { useDragLayer } from 'react-dnd';
import { Tile as TileType } from '../types/game';

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(currentOffset: { x: number; y: number } | null) {
  if (!currentOffset) {
    return {
      display: 'none',
    };
  }

  const { x, y } = currentOffset;
  // Center the tile on the cursor (tile is 40px wide, 48px tall)
  const transform = `translate(${x - 20}px, ${y - 24}px)`;

  return {
    transform,
    WebkitTransform: transform,
  };
}

export const CustomDragLayer: React.FC = () => {
  const { itemType, isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || itemType !== 'tile') {
    return null;
  }

  const tile = item?.tile as TileType;
  if (!tile) {
    return null;
  }

  const colorClasses = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    black: 'text-black',
  };

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(currentOffset)}>
        {tile.isJoker ? (
          <div className="w-10 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-2xl relative opacity-95">
            <div className="absolute inset-0 flex items-center justify-center">
              <span style={{
                fontSize: '48px',
                lineHeight: '1',
                display: 'block',
                transform: 'translateY(-1px)'
              }}>🃏</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-2xl flex items-center justify-center font-bold opacity-95">
            <span className={`${colorClasses[tile.color || 'black']} text-xl`}>{tile.number}</span>
          </div>
        )}
      </div>
    </div>
  );
};
