import { serve, type ServerWebSocket } from "bun";
import index from "./index.html";
import WORDS from "./data/words";
import isCloseGuess from "./util/is-close-guess";

// ============================================================================
// Game Types & State
// ============================================================================

interface Player {
  id: string;
  name: string;
  score: number;
  hasDrawn: boolean;
  avatar?: string;
  isDisconnected?: boolean;
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
  roundTime: number;
  customWords: string[];
}

interface Session {
  sessionId: string;
  socketId: string | null;
  ws: ServerWebSocket<WebSocketData> | null;
  gameId: string | null;
  playerName: string | null;
  avatar: string | null;
  disconnectedAt: number | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const sessions = new Map<string, Session>();
const DISCONNECT_TIMEOUT = 30_000; // 30 seconds
const PING_INTERVAL = 15_000; // 15 seconds

interface WebSocketData {
  id: string;
  sessionId: string | null;
  gameId: string | null;
  playerId: string | null;  // The ID used in game.players (sessionId if available, else socketId)
}

const games = new Map<string, Game>();
const clients = new Map<string, ServerWebSocket<WebSocketData>>();

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
    started: game.started,
    roundTime: game.roundTime,
    customWords: game.customWords
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

function broadcastPersonalized(
  gameId: string,
  type: string,
  getDataForPlayer: (playerId: string) => any
) {
  const game = games.get(gameId);
  if (!game) return;

  game.players.forEach((_, playerId) => {
    const client = clients.get(playerId);
    if (client && client.readyState === WebSocket.OPEN) {
      const data = getDataForPlayer(playerId);
      if (data !== null) {
        client.send(JSON.stringify({ type, data }));
      }
    }
  });
}

function getOrCreateSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      socketId: null,
      ws: null,
      gameId: null,
      playerName: null,
      avatar: null,
      disconnectedAt: null,
      cleanupTimer: null,
    };
    sessions.set(sessionId, session);
  }
  return session;
}

function bindSessionToSocket(session: Session, ws: ServerWebSocket<WebSocketData>) {
  // Clear any pending cleanup
  if (session.cleanupTimer) {
    clearTimeout(session.cleanupTimer);
    session.cleanupTimer = null;
  }
  session.disconnectedAt = null;
  session.socketId = ws.data.id;
  session.ws = ws;
}

function scheduleSessionCleanup(session: Session) {
  if (session.cleanupTimer) {
    clearTimeout(session.cleanupTimer);
  }

  session.cleanupTimer = setTimeout(() => {
    removeSessionPermanently(session.sessionId);
  }, DISCONNECT_TIMEOUT);
}

function removeSessionPermanently(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  console.log('Removing session permanently:', sessionId);

  // Remove from game
  if (session.gameId) {
    const game = games.get(session.gameId);
    if (game) {
      game.players.delete(sessionId);

      if (game.players.size === 0) {
        // Schedule game cleanup
        scheduleGameCleanup(game);
      } else {
        broadcast(session.gameId, 'playerLeft', {
          playerId: sessionId,
          game: getGameState(game)
        });

        // If current drawer left, skip turn
        if (game.started && game.currentDrawer === sessionId) {
          nextTurn(game);
        }
      }
    }
  }

  // Clean up socket reference
  if (session.socketId) {
    clients.delete(session.socketId);
  }

  sessions.delete(sessionId);
}

// Game cleanup tracking
const gameCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleGameCleanup(game: Game) {
  // Cancel existing timer if any
  const existingTimer = gameCleanupTimers.get(game.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    const currentGame = games.get(game.id);
    if (currentGame && currentGame.players.size === 0) {
      console.log('Removing empty game:', game.id);
      if (currentGame.timer) clearInterval(currentGame.timer);
      games.delete(game.id);
      gameCleanupTimers.delete(game.id);
    }
  }, DISCONNECT_TIMEOUT);

  gameCleanupTimers.set(game.id, timer);
}

function cancelGameCleanup(gameId: string) {
  const timer = gameCleanupTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    gameCleanupTimers.delete(gameId);
  }
}

function createGame(gameId: string, creatorId: string, creatorName: string, isPrivate: boolean, avatar?: string): Game {
  const game: Game = {
    id: gameId,
    players: new Map([[creatorId, {
      id: creatorId,
      name: creatorName,
      score: 0,
      hasDrawn: false,
      avatar
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
    drawingData: [],
    roundTime: ROUND_TIME,
    customWords: []
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
  const wordList = game.customWords.length > 0 ? game.customWords : WORDS;
  game.currentWord = wordList[Math.floor(Math.random() * wordList.length)]!;
  game.timeLeft = game.roundTime;

  broadcast(game.id, 'roundStart', {
    drawerId: game.currentDrawer,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds,
    timeLeft: game.timeLeft
  });

  sendTo(game.currentDrawer, 'yourWord', game.currentWord);

  // Send hint to guessers (all players except drawer)
  const wordHint = game.currentWord.split('').map(char => char === ' ' ? '   ' : '_ ').join('').trim();
  game.players.forEach((_, playerId) => {
    if (playerId !== game.currentDrawer) {
      sendTo(playerId, 'hint', wordHint);
    }
  });

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
  const { id: socketId, sessionId, gameId, playerId } = ws.data;
  console.log('Socket disconnected:', socketId, 'session:', sessionId, 'playerId:', playerId);

  // Delete from clients using playerId if available (after join/create), otherwise socketId
  clients.delete(playerId || socketId);

  if (!sessionId) {
    // No session - legacy behavior, just clean up
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) return;

  session.disconnectedAt = Date.now();
  session.ws = null;
  session.socketId = null;

  // Mark player as disconnected in game
  if (session.gameId) {
    const game = games.get(session.gameId);
    if (game) {
      const player = game.players.get(sessionId);
      if (player) {
        player.isDisconnected = true;
        broadcast(session.gameId, 'playerDisconnected', {
          playerId: sessionId,
          game: getGameState(game)
        });

        // If drawer disconnected during active game, skip after grace period
        if (game.started && game.currentDrawer === sessionId) {
          setTimeout(() => {
            const currentGame = games.get(session.gameId!);
            const currentSession = sessions.get(sessionId);
            if (currentGame && currentSession?.disconnectedAt &&
                currentGame.currentDrawer === sessionId) {
              nextTurn(currentGame);
            }
          }, 5000); // 5 second grace period for drawer
        }
      }
    }
  }

  // Schedule cleanup
  scheduleSessionCleanup(session);
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
        const { playerName, isPrivate, avatar, sessionId } = data;
        const gameId = generateId();

        // Use sessionId as player ID if provided, otherwise use socketId
        const playerId = sessionId || socketId;

        if (sessionId) {
          const session = getOrCreateSession(sessionId);
          bindSessionToSocket(session, ws);
          session.gameId = gameId;
          session.playerName = playerName;
          session.avatar = avatar;
          ws.data.sessionId = sessionId;
        }

        // Re-register client under playerId so broadcast/sendTo can find it
        clients.delete(socketId);
        clients.set(playerId, ws);
        ws.data.playerId = playerId;

        const game = createGame(gameId, playerId, playerName, isPrivate, avatar);
        ws.data.gameId = gameId;
        sendTo(playerId, 'gameCreated', { gameId, game: getGameState(game) });
        break;
      }

      case 'joinGame': {
        const { gameId, playerName, avatar, sessionId } = data;
        const game = games.get(gameId);

        if (!game) {
          sendTo(socketId, 'error', 'Game not found');
          return;
        }

        if (game.started) {
          sendTo(socketId, 'error', 'Game already started');
          return;
        }

        // Use sessionId as player ID if provided, otherwise use socketId
        const playerId = sessionId || socketId;

        if (sessionId) {
          const session = getOrCreateSession(sessionId);
          bindSessionToSocket(session, ws);
          session.gameId = gameId;
          session.playerName = playerName;
          session.avatar = avatar;
          ws.data.sessionId = sessionId;
        }

        // Re-register client under playerId so broadcast/sendTo can find it
        clients.delete(socketId);
        clients.set(playerId, ws);
        ws.data.playerId = playerId;

        game.players.set(playerId, {
          id: playerId,
          name: playerName,
          score: 0,
          hasDrawn: false,
          avatar
        });

        ws.data.gameId = gameId;
        broadcast(gameId, 'playerJoined', {
          player: game.players.get(playerId),
          game: getGameState(game)
        });
        break;
      }

      case 'rejoinGame': {
        const { sessionId, gameId } = data;
        const game = games.get(gameId);

        if (!game) {
          sendTo(socketId, 'error', 'game_not_found');
          return;
        }

        const session = sessions.get(sessionId);
        if (!session || session.gameId !== gameId) {
          sendTo(socketId, 'error', 'player_expired');
          return;
        }

        const player = game.players.get(sessionId);
        if (!player) {
          sendTo(socketId, 'error', 'player_not_found');
          return;
        }

        // Reconnect the session
        bindSessionToSocket(session, ws);
        ws.data.gameId = gameId;
        ws.data.sessionId = sessionId;
        ws.data.playerId = sessionId;

        // Re-register client under sessionId (the playerId) so broadcast/sendTo can find it
        clients.delete(socketId);
        clients.set(sessionId, ws);

        // Mark player as reconnected
        player.isDisconnected = false;

        // Cancel any pending game cleanup since someone rejoined
        cancelGameCleanup(gameId);

        // Build rejoin success data
        let currentWord = null;
        let wordHint = null;
        if (game.started && game.currentWord) {
          if (game.currentDrawer === sessionId) {
            currentWord = game.currentWord;
          } else {
            wordHint = game.currentWord.split('').map(char => char === ' ' ? '   ' : '_ ').join('').trim();
          }
        }

        // Send comprehensive rejoin success message
        sendTo(sessionId, 'rejoinSuccess', {
          gameId,
          game: getGameState(game),
          started: game.started,
          drawingData: game.drawingData,
          currentWord,
          wordHint,
          currentDrawer: game.currentDrawer,
          timeLeft: game.timeLeft,
          roundNumber: game.roundNumber,
          totalRounds: game.totalRounds
        });

        // Notify others of reconnection
        broadcast(gameId, 'playerReconnected', {
          playerId: sessionId,
          game: getGameState(game)
        });

        console.log(`Player ${player.name} (${sessionId}) reconnected`);
        break;
      }

      case 'startGame': {
        const { gameId, totalRounds, roundTime, customWords } = data;
        const game = games.get(gameId);
        if (!game || game.players.size < 2) return;

        game.started = true;
        game.roundNumber = 1;
        game.totalRounds = totalRounds;
        game.roundTime = roundTime || ROUND_TIME;
        if (customWords && customWords.length > 0) {
          game.customWords = customWords;
        }
        game.players.forEach(p => {
          p.score = 0;
          p.hasDrawn = false;
        });

        broadcast(gameId, 'gameStarted', getGameState(game));
        startNewRound(game);
        break;
      }

      case 'updateSettings': {
        const { gameId, totalRounds, roundTime, customWords } = data;
        const game = games.get(gameId);
        if (!game || game.started) return;

        if (totalRounds !== undefined) game.totalRounds = totalRounds;
        if (roundTime !== undefined) game.roundTime = roundTime;
        if (customWords !== undefined) game.customWords = customWords;

        broadcast(gameId, 'settingsUpdated', {
          totalRounds: game.totalRounds,
          roundTime: game.roundTime,
          customWords: game.customWords
        });
        break;
      }

      case 'draw': {
        const { gameId, data: drawData } = data;
        const game = games.get(gameId);
        const senderPlayerId = ws.data.playerId || socketId;
        if (!game || game.currentDrawer !== senderPlayerId) return;

        game.drawingData.push(drawData);

        // Broadcast to all except sender
        game.players.forEach((_, pId) => {
          if (pId !== senderPlayerId) {
            sendTo(pId, 'drawing', drawData);
          }
        });
        break;
      }

      case 'clearCanvas': {
        const { gameId } = data;
        const game = games.get(gameId);
        const senderPlayerId = ws.data.playerId || socketId;
        if (!game || game.currentDrawer !== senderPlayerId) return;

        game.drawingData = [];
        broadcast(gameId, 'canvasCleared', null);
        break;
      }

      case 'guess': {
        const { gameId, message: guessMessage } = data;
        const game = games.get(gameId);
        if (!game || !game.started) return;

        const senderPlayerId = ws.data.playerId || socketId;
        const player = game.players.get(senderPlayerId);
        if (!player || senderPlayerId === game.currentDrawer) return;

        const isCorrect = guessMessage.toLowerCase().trim() === game.currentWord?.toLowerCase();
        const isClose = !isCorrect && game.currentWord ? isCloseGuess(guessMessage, game.currentWord) : false;

        broadcastPersonalized(gameId, 'chatMessage', (recipientId) => {
          const isRecipientSender = recipientId === senderPlayerId;
          const isRecipientDrawer = recipientId === game.currentDrawer;
          const hasRecipientGuessed = game.guessedPlayers.has(recipientId);

          if (isCorrect) {
            if (isRecipientSender || isRecipientDrawer || hasRecipientGuessed) {
              return { playerId: senderPlayerId, playerName: player.name, message: guessMessage, isCorrect: true, isClose: false, isSystemLike: false };
            } else {
              return { playerId: senderPlayerId, playerName: player.name, message: `${player.name} guessed the word!`, isCorrect: true, isClose: false, isSystemLike: true };
            }
          } else if (isClose) {
            if (isRecipientSender) {
              return { playerId: senderPlayerId, playerName: player.name, message: guessMessage, isCorrect: false, isClose: true };
            } else {
              return { playerId: senderPlayerId, playerName: player.name, message: guessMessage, isCorrect: false, isClose: false };
            }
          } else {
            return { playerId: senderPlayerId, playerName: player.name, message: guessMessage, isCorrect: false, isClose: false };
          }
        });

        if (isCorrect && !game.guessedPlayers.has(senderPlayerId)) {
          game.guessedPlayers.add(senderPlayerId);

          // Tiered scoring: first guesser gets more points
          const guessOrder = game.guessedPlayers.size;
          const basePoints = guessOrder === 1 ? 150 : guessOrder === 2 ? 125 : guessOrder === 3 ? 100 : Math.max(50, 100 - (guessOrder - 3) * 25);
          const timeBonus = Math.floor((game.timeLeft / ROUND_TIME) * 50);
          const points = basePoints + timeBonus;

          player.score += points;

          const drawer = game.currentDrawer ? game.players.get(game.currentDrawer) : null;
          if (drawer) drawer.score += 50;

          broadcast(gameId, 'correctGuess', {
            playerId: senderPlayerId,
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
    "/*": index,
  },
  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      console.log('Socket connected:', ws.data.id);
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

  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      const socketId = generateId();
      const sessionId = url.searchParams.get('sessionId');

      const upgraded = server.upgrade(req, {
        data: {
          id: socketId,
          sessionId: sessionId,
          gameId: null,
          playerId: null,
        } as WebSocketData,
      });

      if (upgraded) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    if (url.pathname === "/api/hello") {
      if (req.method === "GET") {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      }
      if (req.method === "PUT") {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      }
    }

    const nameMatch = url.pathname.match(/^\/api\/hello\/([^\/]+)$/);
    if (nameMatch) {
      const name = nameMatch[1];
      return Response.json({
        message: `Hello, ${name}!`,
      });
    }

    return new Response(index as unknown as BodyInit, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`🚀 Server running at ${server.url}`);
