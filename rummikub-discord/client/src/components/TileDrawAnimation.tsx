import React, { useEffect, useState, useRef } from 'react';
import { Tile as TileType } from '../types/game';

interface TileDrawAnimationProps {
  tile: TileType | null;
  targetPosition: { x: number; y: number } | null; // Position in the hand where tile will land
  onComplete: () => void;
}

export const TileDrawAnimation: React.FC<TileDrawAnimationProps> = ({ tile, targetPosition, onComplete }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const animationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tile && targetPosition) {
      // Force re-render with new key to restart animation
      setAnimKey(prev => prev + 1);
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
        onComplete();
      }, 1500); // Animation duration (matches CSS - 1.5s)

      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [tile, targetPosition, onComplete]);

  if (!tile || !isAnimating || !targetPosition) return null;

  const colorClasses = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    black: 'text-black',
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div
        key={animKey}
        ref={animationRef}
        className="tile-draw-path"
        style={{
          '--target-x': `${targetPosition.x}px`,
          '--target-y': `${targetPosition.y}px`,
        } as React.CSSProperties}
      >
        {tile.isJoker ? (
          <div className="w-10 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-lg border-2 border-amber-200 relative">
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
          <div className="w-10 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-lg flex items-center justify-center font-bold border-2 border-amber-200">
            <span className={`${colorClasses[tile.color || 'black']} text-xl`}>{tile.number}</span>
          </div>
        )}
      </div>
    </div>
  );
};
