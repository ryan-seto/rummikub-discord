import React from 'react';
import { Player } from '../types/game';

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId: string | null;
}

export const PlayerList: React.FC<PlayerListProps> = ({ 
  players, 
  currentPlayerIndex,
  myPlayerId 
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <h3 className="text-white font-bold text-lg mb-3">Players</h3>
      <div className="space-y-2">
        {players.map((player, index) => {
          const isCurrentPlayer = index === currentPlayerIndex;
          const isMe = player.id === myPlayerId;

          return (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                transition-all duration-200
                ${isCurrentPlayer 
                  ? 'bg-green-600 shadow-lg ring-2 ring-green-400' 
                  : 'bg-gray-700'
                }
                ${isMe ? 'border-2 border-blue-400' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                  {player.avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${player.id}/${player.avatar}.png`}
                      alt={player.username}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    player.username.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Player info */}
                <div>
                  <p className="text-white font-semibold">
                    {player.username}
                    {isMe && <span className="ml-2 text-xs text-blue-300">(You)</span>}
                  </p>
                  <p className="text-gray-300 text-sm">
                    {player.tilesCount} tiles
                    {player.hasPlayedInitial && (
                      <span className="ml-2 text-green-300">✓ Initial</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Turn indicator */}
              {isCurrentPlayer && (
                <div className="flex items-center gap-2">
                  <div className="animate-pulse w-3 h-3 bg-yellow-400 rounded-full" />
                  <span className="text-yellow-400 text-sm font-semibold">
                    Turn
                  </span>
                </div>
              )}

              {/* Ready indicator */}
              {!player.isReady && (
                <span className="text-gray-400 text-xs">
                  Not ready
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
