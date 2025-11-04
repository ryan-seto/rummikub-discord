import React from 'react';

interface GameControlsProps {
  isMyTurn: boolean;
  canEndTurn: boolean;
  timeRemaining: number;
  onDrawTile: () => void;
  onEndTurn: () => void;
  onUndo: () => void;
  onUndoLast: () => void;
  poolSize: number;
}

export const GameControls: React.FC<GameControlsProps> = ({
  isMyTurn,
  canEndTurn,
  timeRemaining,
  onDrawTile,
  onEndTurn,
  onUndo,
  onUndoLast,
  poolSize,
}) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg space-y-4">
      {/* Timer */}
      <div className="text-center">
        <div className="text-gray-400 text-sm mb-1">Time Remaining</div>
        <div
          className={`
            text-3xl font-bold font-mono
            ${timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-white'}
          `}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* Pool info */}
      <div className="text-center p-3 bg-gray-700 rounded-lg">
        <div className="text-gray-400 text-sm">Tiles in Pool</div>
        <div className="text-2xl font-bold text-amber-400">{poolSize}</div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={onDrawTile}
          disabled={!isMyTurn || poolSize === 0}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold
            transition-all duration-200
            ${isMyTurn && poolSize > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transform hover:scale-105'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          🎴 Draw Tile
        </button>

        <button
          onClick={onUndo}
          disabled={!isMyTurn}
          className={`
            w-full py-2 px-4 rounded-lg font-semibold text-sm
            transition-all duration-200
            ${isMyTurn
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          ↩️ Undo Turn
        </button>

        <button
          onClick={onUndoLast}
          disabled={!isMyTurn}
          className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${isMyTurn
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
        >
          <span>↶</span>
          ↩️ Undo Last
        </button>

        <button
          onClick={onEndTurn}
          disabled={!isMyTurn || !canEndTurn}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold
            transition-all duration-200
            ${isMyTurn && canEndTurn
              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer transform hover:scale-105'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          ✓ End Turn
        </button>
      </div>

      {/* Status message */}
      {!isMyTurn && (
        <div className="text-center text-gray-400 text-sm">
          Waiting for other players...
        </div>
      )}
    </div>
  );
};
