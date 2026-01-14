import { useEffect, useRef, useState } from "react";
import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

// export function App() {
//   return (
//     <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
//       <div className="flex justify-center items-center gap-8 mb-8">
//         <img
//           src={logo}
//           alt="Bun Logo"
//           className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] scale-120"
//         />
//         <img
//           src={reactLogo}
//           alt="React Logo"
//           className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] animate-[spin_20s_linear_infinite]"
//         />
//       </div>

//       <h1 className="text-5xl font-bold my-4 leading-tight">Bun + React</h1>
//       <p>
//         Edit <code className="bg-[#1a1a1a] px-2 py-1 rounded font-mono">src/App.tsx</code> and save to test HMR
//       </p>
//     </div>
//   );
// }

export function App() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [currentGameId, setCurrentGameId] = useState('');
  
  const [players, setPlayers] = useState([]);
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds, setTotalRounds] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('gameCreated', ({ gameId, game }) => {
      setCurrentGameId(gameId);
      setPlayers(game.players);
      setScreen('lobby');
    });

    newSocket.on('playerJoined', ({ player, game }) => {
      setPlayers(game.players);
    });

    newSocket.on('gameStarted', (game) => {
      setGameStarted(true);
      setPlayers(game.players);
      setRoundNumber(game.roundNumber);
      setTotalRounds(game.totalRounds);
      clearCanvas();
    });

    newSocket.on('roundStart', ({ drawerId, roundNumber, totalRounds, timeLeft }) => {
      setCurrentDrawer(drawerId);
      setIsDrawer(drawerId === newSocket.id);
      setRoundNumber(roundNumber);
      setTotalRounds(totalRounds);
      setTimeLeft(timeLeft);
      setCurrentWord('');
      setMessages([]);
      clearCanvas();
    });

    newSocket.on('yourWord', (word) => {
      setCurrentWord(word);
    });

    newSocket.on('timeUpdate', (time) => {
      setTimeLeft(time);
    });

    newSocket.on('drawing', (data) => {
      drawOnCanvas(data);
    });

    newSocket.on('canvasCleared', () => {
      clearCanvas();
    });

    newSocket.on('chatMessage', ({ playerId, playerName, message, isCorrect }) => {
      setMessages(prev => [...prev, { playerId, playerName, message, isCorrect }]);
    });

    newSocket.on('correctGuess', ({ playerId, playerName, points }) => {
      setMessages(prev => [...prev, {
        playerId: 'system',
        playerName: 'System',
        message: `${playerName} guessed correctly! (+${points} points)`,
        isCorrect: true
      }]);
    });

    newSocket.on('wordReveal', (word) => {
      setMessages(prev => [...prev, {
        playerId: 'system',
        playerName: 'System',
        message: `The word was: ${word}`,
        isCorrect: false
      }]);
    });

    newSocket.on('gameState', (game) => {
      setPlayers(game.players);
    });

    newSocket.on('gameOver', (scores) => {
      setFinalScores(scores);
      setGameOver(true);
      setGameStarted(false);
    });

    newSocket.on('playerLeft', ({ game }) => {
      setPlayers(game.players);
    });

    newSocket.on('error', (message) => {
      alert(message);
    });

    return () => newSocket.close();
  }, []);

  const createGame = () => {
    if (!playerName.trim() || !socket) return;
    socket.emit('createGame', { playerName, isPrivate: false });
  };

  const joinGame = () => {
    if (!playerName.trim() || !gameId.trim() || !socket) return;
    socket.emit('joinGame', { gameId, playerName });
    setCurrentGameId(gameId);
    setScreen('lobby');
  };

  const startGame = () => {
    if (!socket) return;
    socket.emit('startGame', { gameId: currentGameId, totalRounds });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    if (!socket || !isDrawer) return;
    clearCanvas();
    socket.emit('clearCanvas', { gameId: currentGameId });
  };

  const startDrawing = (e) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    const data = { x, y, color, size: brushSize, type: e.type };
    drawOnCanvas(data);
    
    if (socket) {
      socket.emit('draw', { gameId: currentGameId, data });
    }
  };

  const drawOnCanvas = (data) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
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

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    
    socket.emit('guess', { gameId: currentGameId, message: chatInput });
    setChatInput('');
  };

  const copyGameLink = () => {
    const link = `${window.location.origin}?game=${currentGameId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />

            <button
              onClick={createGame}
              disabled={!playerName.trim()}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 transition"
            >
              Create New Game
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-gray-500 text-sm">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <input
              type="text"
              placeholder="Enter game code"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />

            <button
              onClick={joinGame}
              disabled={!playerName.trim() || !gameId.trim()}
              className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 transition"
            >
              Join Game
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
            <p className="text-sm text-gray-600 mb-2">Share this code:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-2xl font-bold text-purple-600 bg-white px-4 py-2 rounded">{currentGameId}</code>
              <button
                onClick={copyGameLink}
                className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
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
                {isDrawer ? `Draw: ${currentWord}` : 'Guess the drawing!'}
              </p>
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
                <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`text-sm p-2 rounded ${
                      msg.isCorrect ? 'bg-green-200' : msg.playerId === 'system' ? 'bg-blue-100' : 'bg-white'
                    }`}>
                      <span className="font-semibold">{msg.playerName}:</span> {msg.message}
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
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-purple-500 disabled:bg-gray-200"
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
      <APITester />

    </div>
  );
}

export default App;
