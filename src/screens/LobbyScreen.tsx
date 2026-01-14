import { useState } from "react";
import { Player } from "../types";

interface LobbyScreenProps {
  currentGameId: string;
  players: Player[];
  totalRounds: number;
  setTotalRounds: (rounds: number) => void;
  roundTime: number;
  setRoundTime: (time: number) => void;
  customWords: string;
  setCustomWords: (words: string) => void;
  startGame: () => void;
  leaveLobby: () => void;
}

export function LobbyScreen({
  currentGameId,
  players,
  totalRounds,
  setTotalRounds,
  roundTime,
  setRoundTime,
  customWords,
  setCustomWords,
  startGame,
  leaveLobby,
}: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyGameLink = () => {
    const link = `${window.location.origin}?game=${currentGameId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(currentGameId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Game Lobby</h2>
        
        <div className="mb-6 p-4 bg-purple-100 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Share this code with friends:</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <code className="block text-2xl font-bold text-purple-600 bg-white px-4 py-2 pr-12 rounded">{currentGameId}</code>
              <button
                onClick={copyGameCode}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-2xl hover:bg-purple-100 rounded transition"
                title="Copy code to clipboard"
              >
                {copiedCode ? '✓' : '📋'}
              </button>
            </div>
          </div>
          <button
            onClick={copyGameLink}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm flex items-center justify-center gap-2"
          >
            <span>🔗</span>
            <span>{copied ? 'Link Copied!' : 'Copy Shareable Link'}</span>
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of rounds: {totalRounds}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={totalRounds}
            onChange={(e) => setTotalRounds(Number(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && players.length >= 2 && startGame()}
            className="w-full"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time per round (seconds): {roundTime}
          </label>
          <input
            type="range"
            min="30"
            max="180"
            step="15"
            value={roundTime}
            onChange={(e) => setRoundTime(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Words (optional)
          </label>
          <textarea
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value)}
            placeholder="Enter words separated by commas or new lines&#10;e.g., cat, dog, house&#10;or one per line"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 min-h-[80px]"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use default words
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">
            👥 Players ({players.length})
          </h3>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="bg-gray-100 px-4 py-2 rounded-lg flex items-center gap-3">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-8 h-8 border border-gray-300 rounded" />
                ) : (
                  <div className="w-8 h-8 border border-gray-300 rounded bg-white flex items-center justify-center text-xs text-gray-400">
                    ?
                  </div>
                )}
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={startGame}
          disabled={players.length < 2}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 transition"
        >
          {players.length < 2 ? 'Waiting for players...' : 'Start Game'}
        </button>

        <button
          onClick={leaveLobby}
          className="w-full mt-3 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
        >
          Leave Lobby
        </button>
      </div>
    </div>
  );
}
