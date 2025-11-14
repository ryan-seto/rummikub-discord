import React from 'react';
import { Player } from '../types/game';

interface GameControlsProps {
  isMyTurn: boolean;
  canEndTurn: boolean;
  canUndo: boolean;
  canDraw: boolean;
  timeRemaining: number;
  onDrawTile: () => void;
  onEndTurn: () => void;
  onUndo: () => void;
  onUndoLast: () => void;
  onReset: () => void;
  poolSize: number;
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId: string | null;
}

export const GameControls: React.FC<GameControlsProps> = ({
  isMyTurn,
  canEndTurn,
  canUndo,
  canDraw,
  timeRemaining,
  onDrawTile,
  onEndTurn,
  onUndo,
  onUndoLast,
  onReset,
  poolSize,
  players,
  currentPlayerIndex,
  myPlayerId,
}) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="bg-gray-800 rounded-lg p-2 shadow-lg space-y-2">
      {/* Timer and Pool info - side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Timer */}
        <div className="text-center p-2 bg-gray-700 rounded-lg">
          <div className="text-gray-400 text-xs mb-1">Time</div>
          <div
            className={`
              text-xl font-bold font-mono
              ${timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-white'}
            `}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {/* Pool info */}
        <div className="text-center p-2 bg-gray-700 rounded-lg">
          <div className="text-gray-400 text-xs mb-1">Pool</div>
          <div className="text-xl font-bold text-amber-400">{poolSize}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-1">
        <button
          onClick={onDrawTile}
          disabled={!isMyTurn || !canDraw || poolSize === 0}
          className={`
            w-full py-2 px-3 rounded-lg font-semibold text-sm
            transition-all duration-200
            ${isMyTurn && canDraw && poolSize > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }
          `}
        >
          {poolSize === 0 ? '🎴 No Tiles' : '🎴 Draw'}
        </button>

        <button
          onClick={onUndo}
          disabled={!isMyTurn || !canUndo}
          className={`
            w-full py-2 px-3 rounded-lg font-semibold text-sm
            transition-all duration-200
            ${isMyTurn && canUndo
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          ↩️ Undo Turn
        </button>

        <button
          onClick={onUndoLast}
          disabled={!isMyTurn || !canUndo}
          className={`
            w-full py-2 px-3 rounded-lg font-semibold text-sm transition-all
            ${isMyTurn && canUndo
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          ↶ Undo Last
        </button>

        <button
          onClick={onEndTurn}
          disabled={!isMyTurn || !canEndTurn}
          className={`
            w-full py-2 px-3 rounded-lg font-semibold text-sm
            transition-all duration-200
            ${isMyTurn && canEndTurn
              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          ✓ End Turn
        </button>
      </div>

      {/* Reset button (for testing) */}
      <div className="border-t border-gray-700 pt-2">
        <button
          onClick={onReset}
          className="w-full py-1 px-3 rounded-lg font-semibold text-xs
            bg-red-600 hover:bg-red-700 text-white cursor-pointer
            transition-all duration-200"
        >
          🔄 Reset
        </button>
      </div>
    </div>
  );
};