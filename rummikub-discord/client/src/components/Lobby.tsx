import React, { useState } from 'react';
import { Player } from '../types/game';

interface LobbyProps {
  players: Player[];
  onStartGame: (turnTimer: number) => void;
  onToggleReady?: (playerId: string) => void;
  myPlayerId?: string | null;
  minPlayers?: number;
  maxPlayers?: number;
}

const TIMER_OPTIONS = [30, 60, 120]; // 30s, 1min, 2min in seconds

export const Lobby: React.FC<LobbyProps> = ({
  players,
  onStartGame,
  onToggleReady,
  myPlayerId,
  minPlayers = 2,
  maxPlayers = 4,
}) => {
  const [selectedTimerIndex, setSelectedTimerIndex] = useState(1); // Default to 1min

  const canStart = players.length >= minPlayers &&
                   players.length <= maxPlayers &&
                   players.every(p => p.isReady);

  const handlePreviousTimer = () => {
    setSelectedTimerIndex((prev) => (prev === 0 ? TIMER_OPTIONS.length - 1 : prev - 1));
  };

  const handleNextTimer = () => {
    setSelectedTimerIndex((prev) => (prev === TIMER_OPTIONS.length - 1 ? 0 : prev + 1));
  };

  const formatTimer = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${seconds / 60}min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-6">
        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-1">
            Rummikub
          </h1>
          <p className="text-gray-400 text-sm">Waiting for players to join...</p>
        </div>

        {/* Game Rules */}
        <div className="bg-gray-700 rounded-lg p-3 mb-3">
          <h3 className="text-white font-semibold text-sm mb-2">📜 Quick Rules</h3>
          <ul className="text-gray-300 text-xs space-y-0.5">
            <li>• Start with 14 tiles • First play ≥30 points</li>
            <li>• Runs (same color, consecutive) or Groups (same #, diff colors)</li>
            <li>• Melds need 3+ tiles • Jokers substitute any tile</li>
            <li>• First to play all tiles wins!</li>
          </ul>
        </div>

        {/* Timer Selection */}
        <div className="bg-gray-700 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">⏱️ Turn Timer</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousTimer}
                className="w-7 h-7 rounded bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center transition-colors text-sm"
                aria-label="Previous timer option"
              >
                ←
              </button>
              <div className="bg-gray-600 rounded px-4 py-1.5 min-w-[80px] text-center">
                <div className="text-sm font-bold text-white">
                  {formatTimer(TIMER_OPTIONS[selectedTimerIndex])}
                </div>
              </div>
              <button
                onClick={handleNextTimer}
                className="w-7 h-7 rounded bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center transition-colors text-sm"
                aria-label="Next timer option"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Player List */}
        <div className="bg-gray-700 rounded-lg p-3 mb-3">
          <h3 className="text-white font-semibold text-sm mb-2">
            Players ({players.length}/{maxPlayers})
          </h3>
          
          {players.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              <p className="text-sm">No players yet - Invite friends to join!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player, index) => {
                const isMe = player.id === myPlayerId;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isMe ? 'bg-blue-900/30 border border-blue-400' : 'bg-gray-600'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
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
                      <div className="flex items-center gap-1.5">
                        <p className="text-white text-sm font-semibold">{player.username}</p>
                        {isMe && <span className="text-xs text-blue-300">(You)</span>}
                      </div>
                    </div>

                    {/* Ready checkbox for current player, status for others */}
                    {isMe && onToggleReady ? (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={player.isReady}
                          onChange={() => onToggleReady(player.id)}
                          className="w-4 h-4 rounded border-gray-400 text-green-500 focus:ring-1 focus:ring-green-400 cursor-pointer"
                        />
                        <span className="text-white text-xs font-semibold">Ready</span>
                      </label>
                    ) : player.isReady ? (
                      <div className="text-green-400 font-semibold flex items-center gap-0.5">
                        <span className="text-xs">✓ Ready</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Not ready</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Player requirements message */}
        {players.length < minPlayers && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-2 mb-3">
            <p className="text-yellow-400 text-center text-xs">
              Need {minPlayers} players ({minPlayers - players.length} more needed)
            </p>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => onStartGame(TIMER_OPTIONS[selectedTimerIndex])}
          disabled={!canStart}
          className={`
            w-full py-3 rounded-lg font-bold text-base
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
