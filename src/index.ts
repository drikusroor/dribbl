import { serve, type ServerWebSocket } from "bun";
import index from "./index.html";

// ============================================================================
// Game Types & State
// ============================================================================

interface Player {
  id: string;
  name: string;
  score: number;
  hasDrawn: boolean;
}

interface Game {
  id: string;
  players: Map<string, Player>;
  isPrivate: boolean;
  started: boolean;
  currentDrawer: string | null;
  currentWord: string | null;
  roundNumber: number;
  totalRounds: number;
  timeLeft: number;
  timer: ReturnType<typeof setInterval> | null;
  guessedPlayers: Set<string>;
  drawingData: any[];
}

interface WebSocketData {
  id: string;
  gameId: string | null;
}

const games = new Map<string, Game>();
const clients = new Map<string, ServerWebSocket<WebSocketData>>();

const WORDS = [
  'watermelon', 'house', 'cat', 'tree', 'car', 'pizza', 'guitar',
  'mountain', 'bicycle', 'flower', 'rocket', 'elephant', 'beach', 'clock', 'rainbow',
  'phone', 'book', 'computer', 'sun', 'moon', 'star', 'cloud', 'fish', 'bird'
];

const ROUND_TIME = 60;
const POINTS_CORRECT = 100;

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getGameState(game: Game) {
  return {
    players: Array.from(game.players.values()),
    currentDrawer: game.currentDrawer,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds,
    timeLeft: game.timeLeft,
    started: game.started
  };
}

function broadcast(gameId: string, type: string, data: any) {
  const game = games.get(gameId);
  if (!game) return;

  const message = JSON.stringify({ type, data });
  game.players.forEach((_, playerId) => {
    const client = clients.get(playerId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function sendTo(playerId: string, type: string, data: any) {
  const client = clients.get(playerId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type, data }));
  }
}

function createGame(gameId: string, creatorId: string, creatorName: string, isPrivate: boolean): Game {
  const game: Game = {
    id: gameId,
    players: new Map([[creatorId, {
      id: creatorId,
      name: creatorName,
      score: 0,
      hasDrawn: false
    }]]),
    isPrivate,
    started: false,
    currentDrawer: null,
    currentWord: null,
    roundNumber: 0,
    totalRounds: 1,
    timeLeft: ROUND_TIME,
    timer: null,
    guessedPlayers: new Set(),
    drawingData: []
  };
  games.set(gameId, game);
  return game;
}

function getNextDrawer(game: Game): Player | null {
  const availablePlayers = Array.from(game.players.values()).filter(p => !p.hasDrawn);
  return availablePlayers.length > 0 ? availablePlayers[0]! : null;
}

function startNewRound(game: Game) {
  game.guessedPlayers.clear();
  game.drawingData = [];

  const drawer = getNextDrawer(game);

  if (!drawer) {
    // All players have drawn in this round
    if (game.roundNumber >= game.totalRounds) {
      endGame(game);
      return;
    }
    // Reset for next round
    game.players.forEach(p => p.hasDrawn = false);
    game.roundNumber++;
    startNewRound(game);
    return;
  }

  game.currentDrawer = drawer.id;
  game.currentWord = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  game.timeLeft = ROUND_TIME;

  broadcast(game.id, 'roundStart', {
    drawerId: game.currentDrawer,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds,
    timeLeft: game.timeLeft
  });

  sendTo(game.currentDrawer, 'yourWord', game.currentWord);

  startTimer(game);
}

function startTimer(game: Game) {
  if (game.timer) clearInterval(game.timer);

  game.timer = setInterval(() => {
    game.timeLeft--;
    broadcast(game.id, 'timeUpdate', game.timeLeft);

    if (game.timeLeft <= 0) {
      nextTurn(game);
    }
  }, 1000);
}

function nextTurn(game: Game) {
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }

  const drawer = game.currentDrawer ? game.players.get(game.currentDrawer) : null;
  if (drawer) drawer.hasDrawn = true;

  broadcast(game.id, 'wordReveal', game.currentWord);
  broadcast(game.id, 'gameState', getGameState(game));

  setTimeout(() => startNewRound(game), 3000);
}

function endGame(game: Game) {
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }

  game.started = false;
  const finalScores = Array.from(game.players.values())
    .sort((a, b) => b.score - a.score);

  broadcast(game.id, 'gameOver', finalScores);
}

function handleDisconnect(ws: ServerWebSocket<WebSocketData>) {
  const { id: socketId, gameId } = ws.data;
  console.log('User disconnected:', socketId);

  clients.delete(socketId);

  games.forEach((game, gId) => {
    if (game.players.has(socketId)) {
      game.players.delete(socketId);

      if (game.players.size === 0) {
        if (game.timer) clearInterval(game.timer);
        games.delete(gId);
      } else {
        broadcast(gId, 'playerLeft', {
          playerId: socketId,
          game: getGameState(game)
        });

        if (game.started && game.currentDrawer === socketId) {
          nextTurn(game);
        }
      }
    }
  });
}

// ============================================================================
// WebSocket Message Handlers
// ============================================================================

function handleMessage(ws: ServerWebSocket<WebSocketData>, message: string) {
  try {
    const { type, data } = JSON.parse(message);
    const socketId = ws.data.id;

    switch (type) {
      case 'createGame': {
        const { playerName, isPrivate } = data;
        const gameId = generateId();
        const game = createGame(gameId, socketId, playerName, isPrivate);
        ws.data.gameId = gameId;
        sendTo(socketId, 'gameCreated', { gameId, game: getGameState(game) });
        break;
      }

      case 'joinGame': {
        const { gameId, playerName } = data;
        const game = games.get(gameId);

        if (!game) {
          sendTo(socketId, 'error', 'Game not found');
          return;
        }

        if (game.started) {
          sendTo(socketId, 'error', 'Game already started');
          return;
        }

        game.players.set(socketId, {
          id: socketId,
          name: playerName,
          score: 0,
          hasDrawn: false
        });

        ws.data.gameId = gameId;
        broadcast(gameId, 'playerJoined', {
          player: game.players.get(socketId),
          game: getGameState(game)
        });
        break;
      }

      case 'startGame': {
        const { gameId, totalRounds } = data;
        const game = games.get(gameId);
        if (!game || game.players.size < 2) return;

        game.started = true;
        game.roundNumber = 1;
        game.totalRounds = totalRounds;
        game.players.forEach(p => {
          p.score = 0;
          p.hasDrawn = false;
        });

        broadcast(gameId, 'gameStarted', getGameState(game));
        startNewRound(game);
        break;
      }

      case 'draw': {
        const { gameId, data: drawData } = data;
        const game = games.get(gameId);
        if (!game || game.currentDrawer !== socketId) return;

        game.drawingData.push(drawData);
        
        // Broadcast to all except sender
        game.players.forEach((_, playerId) => {
          if (playerId !== socketId) {
            sendTo(playerId, 'drawing', drawData);
          }
        });
        break;
      }

      case 'clearCanvas': {
        const { gameId } = data;
        const game = games.get(gameId);
        if (!game || game.currentDrawer !== socketId) return;

        game.drawingData = [];
        broadcast(gameId, 'canvasCleared', null);
        break;
      }

      case 'guess': {
        const { gameId, message: guessMessage } = data;
        const game = games.get(gameId);
        if (!game || !game.started) return;

        const player = game.players.get(socketId);
        if (!player || socketId === game.currentDrawer) return;

        const isCorrect = guessMessage.toLowerCase().trim() === game.currentWord?.toLowerCase();

        broadcast(gameId, 'chatMessage', {
          playerId: socketId,
          playerName: player.name,
          message: guessMessage,
          isCorrect
        });

        if (isCorrect && !game.guessedPlayers.has(socketId)) {
          game.guessedPlayers.add(socketId);

          const timeBonus = Math.floor((game.timeLeft / ROUND_TIME) * 50);
          const points = POINTS_CORRECT + timeBonus;

          player.score += points;

          const drawer = game.currentDrawer ? game.players.get(game.currentDrawer) : null;
          if (drawer) drawer.score += 50;

          broadcast(gameId, 'correctGuess', {
            playerId: socketId,
            playerName: player.name,
            points
          });

          broadcast(gameId, 'gameState', getGameState(game));

          // If all players guessed, move to next turn
          if (game.guessedPlayers.size === game.players.size - 1) {
            setTimeout(() => nextTurn(game), 2000);
          }
        }
        break;
      }
    }
  } catch (e) {
    console.error('Error handling message:', e);
  }
}

// ============================================================================
// Server Setup
// ============================================================================

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      console.log('User connected:', ws.data.id);
      clients.set(ws.data.id, ws);
    },
    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      handleMessage(ws, message.toString());
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      handleDisconnect(ws);
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

// Handle WebSocket upgrade requests
const originalFetch = server.fetch;
server.fetch = function(req: Request) {
  const url = new URL(req.url);
  
  if (url.pathname === '/ws' && req.headers.get('upgrade') === 'websocket') {
    const socketId = generateId();
    const upgraded = server.upgrade(req, {
      data: {
        id: socketId,
        gameId: null,
      } as WebSocketData,
    });
    
    if (upgraded) {
      return undefined as any;
    }
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
  
  return originalFetch.call(server, req);
};

console.log(`🚀 Server running at ${server.url}`);
