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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Round {roundNumber}/{totalRounds}</h2>
              <p className="text-gray-600">
                {isDrawer ? `Draw: ${currentWord}` : 'Guess the drawing!'}
              </p>
              {!isDrawer && getWordPlaceholder() && (
                <p className="text-sm text-gray-500 mt-1 font-mono tracking-widest">
                  {getWordPlaceholder()}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">{timeLeft}s</div>
              <div className="text-sm text-gray-600">Time left</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                {isDrawer && (
                  <div className="bg-gray-100 p-2 flex items-center gap-2 border-b-2 border-gray-300">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 border-2 border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-600">{brushSize}px</span>
                    <button
                      onClick={handleClearCanvas}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
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
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">👥 Players</h3>
                <div className="space-y-2">
                  {players.map(p => (
                    <div key={p.id} className={`flex justify-between items-center p-2 rounded ${
                      p.id === currentDrawer ? 'bg-purple-200' : 'bg-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} className="w-6 h-6 border border-gray-300 rounded" />
                        ) : (
                          <div className="w-6 h-6 border border-gray-300 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                            ?
                          </div>
                        )}
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <span className="text-purple-600 font-bold">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex flex-col" style={{ height: '300px' }}>
                <h3 className="font-semibold mb-3">💬 Chat</h3>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`text-sm p-2 rounded ${
                      msg.isCorrect ? 'bg-green-200' : 
                      msg.isClose ? 'bg-yellow-200' : 
                      msg.playerId === 'system' ? 'bg-blue-100' : 'bg-white'
                    }`}>
                      <span className="font-semibold">{msg.playerName}:</span> {msg.message}
                      {msg.isClose && <span className="text-xs ml-2 text-orange-600">(Close!)</span>}
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
                    className="flex-1 min-w-0 px-3 py-2 border rounded focus:outline-none focus:border-purple-500 disabled:bg-gray-200 text-gray-900"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isDrawer}
                    className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 flex-shrink-0"
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
