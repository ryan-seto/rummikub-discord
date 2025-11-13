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
          const isMyTurn = isCurrentPlayer && isMe;

          return (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                transition-all duration-200
                ${isMyTurn
                  ? 'bg-green-900/40 ring-4 ring-green-400 shadow-2xl shadow-green-500/50 animate-pulse border-2 border-green-400'
                  : isCurrentPlayer
                    ? 'bg-gray-700 ring-2 ring-green-400 shadow-lg'
                    : isMe
                      ? 'bg-gray-700 border-2 border-blue-400'
                      : 'bg-gray-700 border-2 border-transparent'}
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
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isMe ? 'text-blue-400' : 'text-white'}`}>
                      {player.username}
                    </span>
                    {isMe && <span className="text-xs text-blue-300">(You)</span>}

                    {/* Initial meld status badges */}
                    {!player.hasPlayedInitial && (
                      <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded border border-yellow-600/30">
                        Need 30pts
                      </span>
                    )}
                    {player.hasPlayedInitial && (
                      <span className="text-xs text-green-400 font-bold">✓</span>
                    )}
                  </div>

                  <p className="text-gray-300 text-sm mt-1">
                    {player.tilesCount} tiles
                  </p>
                </div>
              </div>

              {/* Ready indicator - only show if not ready */}
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