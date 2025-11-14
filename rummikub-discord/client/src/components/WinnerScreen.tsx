import React from 'react';
import { Player } from '../types/game';

interface WinnerScreenProps {
  winner: Player;
  onNewGame?: () => void;
}

export const WinnerScreen: React.FC<WinnerScreenProps> = ({ winner, onNewGame }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-amber-900 to-orange-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
        {/* Winner announcement */}
        <h1 className="text-5xl font-bold text-yellow-400 mb-4">
          Victory!
        </h1>
        
        {/* Winner info */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-2xl">
            {winner.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${winner.id}/${winner.avatar}.png`}
                alt={winner.username}
                className="w-full h-full rounded-full"
              />
            ) : (
              winner.username.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-gray-400 text-sm">Winner</p>
            <p className="text-white text-3xl font-bold">{winner.username}</p>
          </div>
        </div>
        
        <p className="text-gray-300 text-xl mb-8">
          Played all their tiles and won the game! 🎴
        </p>
        
        {onNewGame && (
          <button
            onClick={onNewGame}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all transform hover:scale-105"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
};