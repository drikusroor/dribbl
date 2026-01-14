import { useEffect, useRef, useState } from "react";
import { Player, ChatMessage, DrawData } from "../types";

interface GameScreenProps {
  roundNumber: number;
  totalRounds: number;
  isDrawer: boolean;
  currentWord: string;
  wordHint: string;
  timeLeft: number;
  players: Player[];
  currentDrawer: string | null;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  sendMessage: (e: React.FormEvent | React.KeyboardEvent) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  handleClearCanvas: () => void;
  startDrawing: (e: React.MouseEvent | React.TouchEvent) => void;
  draw: (e: React.MouseEvent | React.TouchEvent) => void;
  stopDrawing: () => void;
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
}

export function GameScreen({
  roundNumber,
  totalRounds,
  isDrawer,
  currentWord,
  wordHint,
  timeLeft,
  players,
  currentDrawer,
  messages,
  chatInput,
  setChatInput,
  sendMessage,
  canvasRef,
  chatContainerRef,
  handleClearCanvas,
  startDrawing,
  draw,
  stopDrawing,
  color,
  setColor,
  brushSize,
  setBrushSize,
}: GameScreenProps) {
  
  const getWordPlaceholder = () => {
    if (isDrawer) return '';
    // For guessers, use the hint sent by the server
    if (wordHint) return wordHint;
    // Fallback: generate placeholder from currentWord if available
    if (!currentWord) return '';
    return currentWord
      .split('')
      .map(char => char === ' ' ? '   ' : '_ ')
      .join('')
      .trim();
  };

  return (
    <div className="min-h-screen p-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-[#E8E8E8] via-white to-[#E8E8E8] rounded-3xl shadow-[0_0_50px_rgba(0,212,255,0.4),0_0_100px_rgba(182,32,224,0.2)] p-6 mb-4 border-4 border-transparent relative overflow-hidden" style={{borderImage: 'linear-gradient(135deg, rgba(0,212,255,0.5), rgba(182,32,224,0.5), rgba(255,47,146,0.5)) 1'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#B620E0]/5 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-[#00D4FF] via-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent">Round {roundNumber}/{totalRounds}</h2>
              <p className="text-lg font-bold bg-gradient-to-r from-[#B620E0] to-[#00D4FF] bg-clip-text text-transparent">
                {isDrawer ? `Draw: ${currentWord}` : 'Guess the drawing!'}
              </p>
              {!isDrawer && getWordPlaceholder() && (
                <p className="text-sm mt-1 font-mono tracking-widest font-bold bg-gradient-to-r from-[#00FF88] to-[#00D4FF] bg-clip-text text-transparent">
                  {getWordPlaceholder()}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-5xl font-black bg-gradient-to-r from-[#FF2F92] to-[#00D4FF] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,47,146,0.5)]">{timeLeft}s</div>
              <div className="text-sm font-bold bg-gradient-to-r from-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent">Time left</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative z-10">
            <div className="lg:col-span-3">
              <div className="bg-white border-3 border-[#00D4FF] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,212,255,0.3)]">
                {isDrawer && (
                  <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#B620E0]/10 p-3 flex items-center gap-2 border-b-3 border-[#00D4FF]">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-12 border-2 border-[#B620E0] rounded-lg cursor-pointer shadow-[0_0_15px_rgba(182,32,224,0.4)]"
                    />
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="flex-1 accent-[#00D4FF]"
                    />
                    <span className="text-sm font-bold bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent min-w-[50px]">{brushSize}px</span>
                    <button
                      onClick={handleClearCanvas}
                      className="px-4 py-2 bg-gradient-to-r from-[#FF2F92] to-[#FF0055] text-white rounded-lg hover:shadow-[0_0_20px_rgba(255,47,146,0.6)] font-bold border-2 border-[#FF2F92]/30 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className={`w-full bg-white ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
                  style={{ touchAction: 'none' }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#00D4FF]/10 to-[#B620E0]/10 rounded-2xl p-5 border-2 border-[#00D4FF]/30 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                <h3 className="font-black text-lg mb-4 bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">👥 Players</h3>
                <div className="space-y-2">
                  {players.map(p => (
                    <div key={p.id} className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all ${
                      p.id === currentDrawer 
                        ? 'bg-gradient-to-r from-[#B620E0]/20 to-[#FF2F92]/20 border-[#B620E0]/50 shadow-[0_0_15px_rgba(182,32,224,0.3)]' 
                        : 'bg-white/80 border-[#00D4FF]/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} className="w-8 h-8 border-2 border-[#00D4FF] rounded-lg shadow-[0_0_10px_rgba(0,212,255,0.3)]" />
                        ) : (
                          <div className="w-8 h-8 border-2 border-[#B620E0] rounded-lg bg-gradient-to-br from-[#1A0033] to-[#2D004D] flex items-center justify-center text-xs text-[#00D4FF] shadow-[0_0_10px_rgba(182,32,224,0.3)]">
                            ?
                          </div>
                        )}
                        <span className="font-bold bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">{p.name}</span>
                      </div>
                      <span className="text-xl font-black bg-gradient-to-r from-[#FF2F92] to-[#00D4FF] bg-clip-text text-transparent">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#B620E0]/10 to-[#FF2F92]/10 rounded-2xl p-5 flex flex-col border-2 border-[#B620E0]/30 shadow-[0_0_20px_rgba(182,32,224,0.2)]" style={{ height: '300px' }}>
                <h3 className="font-black text-lg mb-4 bg-gradient-to-r from-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent">💬 Chat</h3>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`text-sm p-3 rounded-xl border-2 font-medium ${
                      msg.isCorrect ? 'bg-gradient-to-r from-[#00FF88]/30 to-[#00D4FF]/30 border-[#00FF88]/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]' : 
                      msg.isClose ? 'bg-gradient-to-r from-[#FFD700]/30 to-[#FFA500]/30 border-[#FFD700]/50 shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 
                      msg.playerId === 'system' ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#B620E0]/20 border-[#00D4FF]/40' : 'bg-white/80 border-[#00D4FF]/20'
                    }`}>
                      <span className="font-black bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">{msg.playerName}:</span> {msg.message}
                      {msg.isClose && <span className="text-xs ml-2 font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">(Close!)</span>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 min-w-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
                    placeholder="Type your guess..."
                    disabled={isDrawer}
                    className="flex-1 min-w-0 px-4 py-3 border-2 border-[#00D4FF] rounded-xl focus:outline-none focus:border-[#B620E0] focus:shadow-[0_0_15px_rgba(182,32,224,0.4)] disabled:bg-gray-300/50 bg-white/90 font-medium text-gray-900 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isDrawer}
                    className="px-4 py-3 bg-gradient-to-r from-[#00D4FF] to-[#B620E0] text-white rounded-xl hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex-shrink-0 font-bold border-2 border-[#00D4FF]/30 transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
