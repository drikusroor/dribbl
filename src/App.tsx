import { useEffect, useRef, useState } from "react";
import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

// WebSocket helper type
type WebSocketMessage = {
  type: string;
  data: any;
};

// Type definitions
interface Player {
  id: string;
  name: string;
  score: number;
  hasDrawn: boolean;
}

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  isCorrect: boolean;
  isClose?: boolean;
}

interface DrawData {
  x: number;
  y: number;
  color: string;
  size: number;
  type: string;
}

export function App() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [screen, setScreen] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [currentGameId, setCurrentGameId] = useState('');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentDrawer, setCurrentDrawer] = useState<string | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds, setTotalRounds] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState<Player[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Store socketId in ref to access in event handlers
  const socketIdRef = useRef<string | null>(null);

  // Check URL for game code and auto-fill
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameCode = urlParams.get('game');
    if (gameCode) {
      setGameId(gameCode);
    }
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('WebSocket connected');
      setSocket(newSocket);
    };

    newSocket.onmessage = (event) => {
      const { type, data }: WebSocketMessage = JSON.parse(event.data);
      
      switch (type) {
        case 'gameCreated': {
          const { gameId, game } = data;
          setCurrentGameId(gameId);
          setPlayers(game.players);
          // Find our player ID from the players list (we're the only one at creation)
          if (game.players.length > 0) {
            const myId = game.players[0].id;
            setSocketId(myId);
            socketIdRef.current = myId;
          }
          setScreen('lobby');
          break;
        }

        case 'playerJoined': {
          const { player, game } = data;
          setPlayers(game.players);
          // If we just joined, find our ID (we're the last player)
          if (!socketIdRef.current && game.players.length > 0) {
            const myId = game.players[game.players.length - 1].id;
            setSocketId(myId);
            socketIdRef.current = myId;
          }
          break;
        }

        case 'gameStarted': {
          const game = data;
          setGameStarted(true);
          setScreen('game');
          setPlayers(game.players);
          setRoundNumber(game.roundNumber);
          setTotalRounds(game.totalRounds);
          clearCanvas();
          break;
        }

        case 'roundStart': {
          const { drawerId, roundNumber, totalRounds, timeLeft } = data;
          setCurrentDrawer(drawerId);
          setIsDrawer(drawerId === socketIdRef.current);
          setRoundNumber(roundNumber);
          setTotalRounds(totalRounds);
          setTimeLeft(timeLeft);
          setCurrentWord('');
          setMessages([]);
          clearCanvas();
          break;
        }

        case 'yourWord': {
          setCurrentWord(data);
          break;
        }

        case 'timeUpdate': {
          setTimeLeft(data);
          break;
        }

        case 'drawing': {
          drawOnCanvas(data);
          break;
        }

        case 'canvasCleared': {
          clearCanvas();
          break;
        }

        case 'chatMessage': {
          const { playerId, playerName, message, isCorrect, isClose } = data;
          setMessages(prev => [...prev, { playerId, playerName, message, isCorrect, isClose }]);
          break;
        }

        case 'correctGuess': {
          const { playerId, playerName, points } = data;
          setMessages(prev => [...prev, {
            playerId: 'system',
            playerName: 'System',
            message: `${playerName} guessed correctly! (+${points} points)`,
            isCorrect: true
          }]);
          break;
        }

        case 'wordReveal': {
          const word = data;
          setMessages(prev => [...prev, {
            playerId: 'system',
            playerName: 'System',
            message: `The word was: ${word}`,
            isCorrect: false
          }]);
          break;
        }

        case 'gameState': {
          const game = data;
          setPlayers(game.players);
          break;
        }

        case 'gameOver': {
          const scores = data;
          setFinalScores(scores);
          setGameOver(true);
          setGameStarted(false);
          break;
        }

        case 'playerLeft': {
          const { game } = data;
          setPlayers(game.players);
          break;
        }

        case 'error': {
          alert(data);
          break;
        }
      }
    };

    newSocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => newSocket.close();
  }, []);

  // Helper function to send messages
  const emit = (type: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }));
    }
  };

  const createGame = () => {
    if (!playerName.trim() || !socket) return;
    emit('createGame', { playerName, isPrivate: false });
  };

  const joinGame = () => {
    if (!playerName.trim() || !gameId.trim() || !socket) return;
    emit('joinGame', { gameId, playerName });
    setCurrentGameId(gameId);
    setScreen('lobby');
  };

  const startGame = () => {
    if (!socket) return;
    emit('startGame', { gameId: currentGameId, totalRounds });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    if (!socket || !isDrawer) return;
    clearCanvas();
    emit('clearCanvas', { gameId: currentGameId });
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX ?? 0;
    const clientY = 'clientY' in e ? e.clientY : e.touches?.[0]?.clientY ?? 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const data: DrawData = { x, y, color, size: brushSize, type: e.type };
    drawOnCanvas(data);
    
    if (socket) {
      emit('draw', { gameId: currentGameId, data });
    }
  };

  const drawOnCanvas = (data: DrawData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.type === 'mousedown' || data.type === 'touchstart') {
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    } else {
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    }
  };

  const sendMessage = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    
    emit('guess', { gameId: currentGameId, message: chatInput });
    setChatInput('');
  };

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

  const getWordPlaceholder = () => {
    if (!currentWord || isDrawer) return '';
    return currentWord
      .split('')
      .map(char => char === ' ' ? '   ' : '_ ')
      .join('')
      .trim();
  };

  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 text-6xl">✏️</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Dribbl</h1>
            <p className="text-gray-600">Draw, guess, and have fun!</p>
          </div>

          <div className="space-y-6">
            {/* Name input - always shown first */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && playerName.trim()) {
                    if (gameId.trim()) {
                      joinGame();
                    } else {
                      createGame();
                    }
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900"
                autoFocus
              />
            </div>

            {/* Game code input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Game Code (optional)
              </label>
              <input
                type="text"
                placeholder="Leave empty to create a new game"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && playerName.trim()) {
                    if (gameId.trim()) {
                      joinGame();
                    } else {
                      createGame();
                    }
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900"
              />
              {gameId && (
                <p className="text-sm text-gray-500 mt-1">Press Enter to join this game</p>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={gameId.trim() ? joinGame : createGame}
              disabled={!playerName.trim()}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 transition"
            >
              {gameId.trim() ? 'Join Game' : 'Create New Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
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
            <h3 className="font-semibold text-gray-700 mb-3">
              👥 Players ({players.length})
            </h3>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="bg-gray-100 px-4 py-2 rounded-lg">
                  {p.name}
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
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-gray-800">Game Over!</h2>
          </div>

          <div className="space-y-3 mb-6">
            {finalScores.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between p-4 rounded-lg ${
                i === 0 ? 'bg-yellow-100 border-2 border-yellow-400' :
                i === 1 ? 'bg-gray-100 border-2 border-gray-400' :
                i === 2 ? 'bg-orange-100 border-2 border-orange-400' :
                'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-600">#{i + 1}</span>
                  <span className="font-semibold">{p.name}</span>
                </div>
                <span className="text-xl font-bold text-purple-600">{p.score}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Round {roundNumber}/{totalRounds}</h2>
              <p className="text-gray-600">
                {isDrawer ? `Draw: ${currentWord}` : getWordPlaceholder() || 'Guess the drawing!'}
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
                      <span className="font-medium">{p.name}</span>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
                    placeholder="Type your guess..."
                    disabled={isDrawer}
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-purple-500 disabled:bg-gray-200 text-gray-900"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isDrawer}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300"
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

export default App;
