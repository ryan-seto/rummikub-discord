import React from 'react';
import { Player } from '../types/game';

interface LobbyProps {
  players: Player[];
  onStartGame: () => void;
  onToggleReady?: (playerId: string) => void;
  myPlayerId?: string | null;
  minPlayers?: number;
  maxPlayers?: number;
}

export const Lobby: React.FC<LobbyProps> = ({
  players,
  onStartGame,
  onToggleReady,
  myPlayerId,
  minPlayers = 2,
  maxPlayers = 4,
}) => {
  const canStart = players.length >= minPlayers && 
                   players.length <= maxPlayers && 
                   players.every(p => p.isReady);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            Rummikub
          </h1>
          <p className="text-gray-400">Waiting for players to join...</p>
        </div>

        {/* Game Rules */}
        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-white font-bold text-lg mb-3">📜 Quick Rules</h3>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>• Each player starts with 14 tiles</li>
            <li>• First play must total at least 30 points</li>
            <li>• Form runs (same color, consecutive) or groups (same number, different colors)</li>
            <li>• Each meld must have at least 3 tiles</li>
            <li>• Jokers can substitute any tile</li>
            <li>• First player to play all tiles wins!</li>
          </ul>
        </div>

        {/* Player List */}
        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-white font-bold text-lg mb-4">
            Players ({players.length}/{maxPlayers})
          </h3>
          
          {players.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No players yet</p>
              <p className="text-sm mt-2">Invite friends to join!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player, index) => {
                const isMe = player.id === myPlayerId;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isMe ? 'bg-blue-900/30 border-2 border-blue-400' : 'bg-gray-600'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
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

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{player.username}</p>
                        {isMe && <span className="text-xs text-blue-300">(You)</span>}
                      </div>
                      <p className="text-gray-400 text-sm">
                        Player {index + 1}
                      </p>
                    </div>

                    {/* Ready checkbox for current player, status for others */}
                    {isMe && onToggleReady ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={player.isReady}
                          onChange={() => onToggleReady(player.id)}
                          className="w-5 h-5 rounded border-gray-400 text-green-500 focus:ring-2 focus:ring-green-400 cursor-pointer"
                        />
                        <span className="text-white text-sm font-semibold">Ready</span>
                      </label>
                    ) : player.isReady ? (
                      <div className="text-green-400 font-semibold flex items-center gap-1">
                        <span>✓</span>
                        <span className="text-sm">Ready</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Not ready</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Player requirements message */}
        {players.length < minPlayers && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-center">
              Need at least {minPlayers} players to start
              ({minPlayers - players.length} more needed)
            </p>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className={`
            w-full py-4 rounded-lg font-bold text-lg
            transition-all duration-200
            ${canStart
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white cursor-pointer transform hover:scale-105 shadow-lg'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {canStart ? '🎮 Start Game' : 'Waiting for players...'}
        </button>
      </div>
    </div>
  );
};
