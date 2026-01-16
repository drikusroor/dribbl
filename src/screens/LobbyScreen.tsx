import { useState } from "react";
import { Player } from "../types";
import { useSounds } from '../contexts/SoundContext';

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
  const sounds = useSounds();
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
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="bg-gradient-to-br from-[#E8E8E8] via-white to-[#E8E8E8] rounded-3xl shadow-[0_0_60px_rgba(0,212,255,0.4),0_0_120px_rgba(182,32,224,0.2),inset_0_2px_20px_rgba(255,255,255,0.8)] p-10 max-w-4xl w-full border-4 border-transparent relative overflow-hidden backdrop-blur-sm" style={{borderImage: 'linear-gradient(135deg, rgba(0,212,255,0.5), rgba(182,32,224,0.5), rgba(255,47,146,0.5)) 1'}}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#B620E0]/5 pointer-events-none"></div>
        <h2 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-[#00D4FF] via-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent relative z-10" style={{textShadow: '0 0 30px rgba(0,212,255,0.3)'}}>Game Lobby</h2>
        
        <div className="mb-8 p-6 bg-gradient-to-br from-[#00D4FF]/10 via-[#B620E0]/10 to-transparent rounded-2xl border-2 border-[#00D4FF]/30 shadow-[0_0_20px_rgba(0,212,255,0.2)] relative z-10">
          <p className="text-sm font-bold mb-3 bg-gradient-to-r from-[#B620E0] to-[#00D4FF] bg-clip-text text-transparent">Share this code with friends:</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <code className="block text-3xl font-black bg-gradient-to-r from-[#00D4FF] via-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent bg-white/90 px-5 py-3 pr-14 rounded-xl border-2 border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.3)]">{currentGameId}</code>
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
            className="w-full px-5 py-3 bg-gradient-to-r from-[#B620E0] to-[#00D4FF] text-white rounded-xl hover:shadow-[0_0_25px_rgba(182,32,224,0.5)] transition-all text-sm font-bold flex items-center justify-center gap-2 border-2 border-[#00D4FF]/30"
          >
            <span>🔗</span>
            <span>{copied ? 'Link Copied!' : 'Copy Shareable Link'}</span>
          </button>
        </div>

        <div className="mb-6 relative z-10">
          <label className="block text-sm font-bold mb-3 bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">
            Number of rounds: <span className="text-2xl">{totalRounds}</span>
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={totalRounds}
            onChange={(e) => setTotalRounds(Number(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && players.length >= 2 && startGame()}
            className="w-full h-3 bg-gradient-to-r from-[#00D4FF]/20 to-[#B620E0]/20 rounded-full appearance-none cursor-pointer accent-[#00D4FF] border-2 border-[#00D4FF]/30 shadow-[0_0_10px_rgba(0,212,255,0.2)]"
          />
        </div>

        <div className="mb-6 relative z-10">
          <label className="block text-sm font-bold mb-3 bg-gradient-to-r from-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent">
            Time per round (seconds): <span className="text-2xl">{roundTime}</span>
          </label>
          <input
            type="range"
            min="30"
            max="180"
            step="15"
            value={roundTime}
            onChange={(e) => setRoundTime(Number(e.target.value))}
            className="w-full h-3 bg-gradient-to-r from-[#B620E0]/20 to-[#FF2F92]/20 rounded-full appearance-none cursor-pointer accent-[#B620E0] border-2 border-[#B620E0]/30 shadow-[0_0_10px_rgba(182,32,224,0.2)]"
          />
        </div>

        <div className="mb-8 relative z-10">
          <label className="block text-sm font-bold mb-3 bg-gradient-to-r from-[#00FF88] to-[#00D4FF] bg-clip-text text-transparent">
            Custom Words (optional)
          </label>
          <textarea
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value)}
            placeholder="Enter words separated by commas or new lines&#10;e.g., cat, dog, house&#10;or one per line"
            className="w-full px-4 py-3 border-3 border-[#00FF88] rounded-xl focus:border-[#00D4FF] focus:shadow-[0_0_20px_rgba(0,255,136,0.4)] focus:outline-none bg-white/90 backdrop-blur-sm font-medium text-gray-900 min-h-[100px] transition-all"
          />
          <p className="text-xs font-semibold bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent mt-2">
            Leave empty to use default words
          </p>
        </div>

        <div className="mb-8 relative z-10">
          <h3 className="font-black text-lg mb-4 bg-gradient-to-r from-[#FF2F92] to-[#00D4FF] bg-clip-text text-transparent">
            👥 Players ({players.length})
          </h3>
          <div className="space-y-3">
            {players.map(p => (
              <div key={p.id} className="bg-gradient-to-r from-[#00D4FF]/10 to-[#B620E0]/10 px-5 py-3 rounded-xl flex items-center gap-3 border-2 border-[#00D4FF]/20 shadow-[0_0_10px_rgba(0,212,255,0.1)] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-10 h-10 border-2 border-[#00D4FF] rounded-lg shadow-[0_0_10px_rgba(0,212,255,0.3)]" />
                ) : (
                  <div className="w-10 h-10 border-2 border-[#B620E0] rounded-lg bg-gradient-to-br from-[#1A0033] to-[#2D004D] flex items-center justify-center text-sm text-[#00D4FF] shadow-[0_0_10px_rgba(182,32,224,0.3)]">
                    ?
                  </div>
                )}
                <span className="font-bold bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            startGame();
          }}
          disabled={players.length < 2}
          className="w-full bg-gradient-to-r from-[#00FF88] via-[#00D4FF] to-[#B620E0] text-black py-4 rounded-xl font-black text-lg hover:shadow-[0_0_30px_rgba(0,255,136,0.6),0_0_60px_rgba(0,212,255,0.4)] disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-600 disabled:shadow-none transition-all border-2 border-white/30 relative overflow-hidden group mb-3"
        >
          <span className="relative z-10">{players.length < 2 ? 'Waiting for players...' : 'Start Game'}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </button>

        <button
          onClick={leaveLobby}
          className="w-full bg-gradient-to-r from-[#FF2F92] to-[#FF0055] text-white py-4 rounded-xl font-black text-lg hover:shadow-[0_0_30px_rgba(255,47,146,0.6)] transition-all border-2 border-[#FF2F92]/30 relative overflow-hidden group"
        >
          <span className="relative z-10">Leave Lobby</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </button>
      </div>
    </div>
  );
}
