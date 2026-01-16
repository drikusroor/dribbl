import { useEffect, useRef, useState } from "react";
import { APITester } from "./APITester";
import { HomeScreen } from "./screens/HomeScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { GameScreen } from "./screens/GameScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { Player, ChatMessage, DrawData } from "./types";
import "./index.css";

// WebSocket helper type
type WebSocketMessage = {
  type: string;
  data: any;
};

// Connection states for reconnection logic
type ConnectionState = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export function App() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [screen, setScreen] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [currentGameId, setCurrentGameId] = useState('');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentDrawer, setCurrentDrawer] = useState<string | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [wordHint, setWordHint] = useState('');
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
  const [avatar, setAvatar] = useState<string>('');
  const [roundTime, setRoundTime] = useState(60);
  const [customWords, setCustomWords] = useState('');

  // Store socketId in ref to access in event handlers
  const socketIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxReconnectAttempts = 10;

  // Generate or retrieve session ID for reconnection
  useEffect(() => {
    let storedSessionId = localStorage.getItem('sessionId');
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', storedSessionId);
    }
    sessionIdRef.current = storedSessionId;
  }, []);

  // Load avatar and name from localStorage
  useEffect(() => {
    const savedAvatar = localStorage.getItem('playerAvatar');
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  // Save name to localStorage when it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

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
    let currentSocket: WebSocket | null = null;
    let isManualClose = false;

    const getReconnectDelay = (attempt: number): number => {
      if (attempt === 0) return 0;
      if (attempt === 1) return 1000;
      if (attempt === 2) return 2000;
      if (attempt === 3) return 4000;
      if (attempt === 4) return 8000;
      return 10000; // Cap at 10 seconds for attempts 5+
    };

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const newSocket = new WebSocket(wsUrl);
      currentSocket = newSocket;
      
      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setSocket(newSocket);
        setConnectionState('CONNECTED');
        setReconnectAttempt(0);

        // If we have a gameId and we're reconnecting, try to rejoin
        if (currentGameId && sessionIdRef.current && reconnectAttempt > 0) {
          newSocket.send(JSON.stringify({
            type: 'rejoinGame',
            data: {
              sessionId: sessionIdRef.current,
              gameId: currentGameId
            }
          }));
        }
      };

      newSocket.onmessage = (event) => {
        const { type, data }: WebSocketMessage = JSON.parse(event.data);
        
        switch (type) {
          case 'gameCreated': {
            const { gameId, game } = data;
            setCurrentGameId(gameId);
            setPlayers(game.players);
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
            setWordHint('');
            setMessages([]);
            clearCanvas();
            break;
          }

          case 'yourWord': {
            setCurrentWord(data);
            break;
          }

          case 'hint': {
            setWordHint(data);
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
            if (data === 'game_not_found' || data === 'player_expired') {
              setScreen('home');
              setCurrentGameId('');
              setPlayers([]);
              setGameStarted(false);
              alert('The game is no longer available. Returning to home screen.');
            } else {
              alert(data);
            }
            break;
          }
        }
      };

      newSocket.onclose = () => {
        console.log('WebSocket disconnected');
        setSocket(null);
        
        if (!isManualClose) {
          setConnectionState('RECONNECTING');
          setReconnectAttempt(prev => {
            const nextAttempt = prev + 1;
            
            if (nextAttempt <= maxReconnectAttempts) {
              const delay = getReconnectDelay(nextAttempt);
              console.log(`Reconnecting in ${delay}ms (attempt ${nextAttempt}/${maxReconnectAttempts})`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                connectWebSocket();
              }, delay);
            } else {
              console.log('Max reconnection attempts reached');
              setConnectionState('DISCONNECTED');
            }
            
            return nextAttempt;
          });
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    // Initial connection
    connectWebSocket();

    return () => {
      isManualClose = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (currentSocket) {
        currentSocket.close();
      }
    };
  }, []);

  // Helper function to send messages
  const emit = (type: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }));
    }
  };

  const createGame = () => {
    if (!playerName.trim() || !socket) return;
    emit('createGame', { 
      playerName, 
      isPrivate: false, 
      avatar,
      sessionId: sessionIdRef.current 
    });
  };

  const joinGame = () => {
    if (!playerName.trim() || !gameId.trim() || !socket) return;
    emit('joinGame', { 
      gameId, 
      playerName, 
      avatar,
      sessionId: sessionIdRef.current 
    });
    setCurrentGameId(gameId);
    setScreen('lobby');
  };

  const startGame = () => {
    if (!socket) return;
    const customWordsList = customWords.trim() 
      ? customWords.split(/[,\n]+/).map(w => w.trim()).filter(w => w.length > 0)
      : [];
    emit('startGame', { gameId: currentGameId, totalRounds, roundTime, customWords: customWordsList });
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
    // Scale coordinates to match canvas internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

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





  const leaveLobby = () => {
    setScreen('home');
    setCurrentGameId('');
    setPlayers([]);
    setGameStarted(false);
    setGameOver(false);
    setMessages([]);
  };

  const returnToLobby = () => {
    setGameOver(false);
    setGameStarted(false);
    setScreen('lobby');
    setMessages([]);
    setCurrentWord('');
    setWordHint('');
    setIsDrawer(false);
    setCurrentDrawer(null);
    setRoundNumber(0);
    clearCanvas();
  };

  // Connection status banner component
  const ConnectionBanner = () => {
    if (connectionState === 'CONNECTED') return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '8px',
        textAlign: 'center',
        backgroundColor: connectionState === 'RECONNECTING' ? '#ffa500' : '#dc3545',
        color: 'white',
        fontSize: '14px',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        {connectionState === 'RECONNECTING' && (
          <>Reconnecting... (attempt {reconnectAttempt}/{maxReconnectAttempts})</>
        )}
        {connectionState === 'DISCONNECTED' && (
          <>Connection lost. Please refresh the page to reconnect.</>
        )}
      </div>
    );
  };

  if (screen === 'home') {
    return (
      <>
        <ConnectionBanner />
        <HomeScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          gameId={gameId}
          setGameId={setGameId}
          joinGame={gameId.trim() ? joinGame : createGame}
          createGame={createGame}
          avatar={avatar}
          setAvatar={setAvatar}
        />
      </>
    );
  }

  if (screen === 'lobby') {
    return (
      <>
        <ConnectionBanner />
        <LobbyScreen
          currentGameId={currentGameId}
          players={players}
          totalRounds={totalRounds}
          setTotalRounds={setTotalRounds}
          roundTime={roundTime}
          setRoundTime={setRoundTime}
          customWords={customWords}
          setCustomWords={setCustomWords}
          startGame={startGame}
          leaveLobby={leaveLobby}
        />
      </>
    );
  }

  if (gameOver) {
    return (
      <>
        <ConnectionBanner />
        <GameOverScreen
          finalScores={finalScores}
          returnToLobby={returnToLobby}
        />
      </>
    );
  }

  return (
    <>
      <ConnectionBanner />
      <GameScreen
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        isDrawer={isDrawer}
        currentWord={currentWord}
        wordHint={wordHint}
        timeLeft={timeLeft}
        players={players}
        currentDrawer={currentDrawer}
        messages={messages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        sendMessage={sendMessage}
        canvasRef={canvasRef}
        chatContainerRef={chatContainerRef}
        handleClearCanvas={handleClearCanvas}
        startDrawing={startDrawing}
        draw={draw}
        stopDrawing={stopDrawing}
        color={color}
        setColor={setColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
      />
    </>
  );
}

export default App;
