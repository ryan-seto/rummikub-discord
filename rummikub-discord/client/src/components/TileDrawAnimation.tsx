import React, { useEffect, useState } from 'react';
import { Tile as TileType } from '../types/game';

interface TileDrawAnimationProps {
  tile: TileType | null;
  onComplete: () => void;
}

export const TileDrawAnimation: React.FC<TileDrawAnimationProps> = ({ tile, onComplete }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (tile) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onComplete();
      }, 1500); // Animation duration (matches CSS)

      return () => clearTimeout(timer);
    }
  }, [tile, onComplete]);

  if (!tile || !isAnimating) return null;

  const colorClasses = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    black: 'text-black',
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="tile-draw-path">
        {tile.isJoker ? (
          <div className="w-10 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-2xl relative">
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
          <div className="w-10 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-2xl flex items-center justify-center font-bold">
            <span className={`${colorClasses[tile.color || 'black']} text-xl`}>{tile.number}</span>
          </div>
        )}
      </div>
    </div>
  );
};
