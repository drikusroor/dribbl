# WebSocket Auto-Reconnect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automatic WebSocket reconnection with 30-second grace period for disconnected players and lobbies.

**Architecture:** Client stores sessionId in localStorage and sends it with join/create. Server tracks sessions separately from sockets, allowing players to reconnect and resume their identity. Disconnected players/lobbies are cleaned up after 30 seconds.

**Tech Stack:** Bun WebSockets, React, localStorage

---

## Task 1: Add Session Types to Server

**Files:**
- Modify: `src/index.ts:10-41`

**Step 1: Add Session interface and constants**

Add after line 33 (after Game interface):

```typescript
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
```

**Step 2: Update WebSocketData interface**

Replace the WebSocketData interface (lines 35-38):

```typescript
interface WebSocketData {
  id: string;
  sessionId: string | null;
  gameId: string | null;
}
```

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add session types and constants for reconnection support"
```

---

## Task 2: Add isDisconnected to Player Type

**Files:**
- Modify: `src/index.ts:10-16`
- Modify: `src/types.ts:1-7`

**Step 1: Update server Player interface**

Replace Player interface in `src/index.ts` (lines 10-16):

```typescript
interface Player {
  id: string;
  name: string;
  score: number;
  hasDrawn: boolean;
  avatar?: string;
  isDisconnected?: boolean;
}
```

**Step 2: Update shared Player type**

Replace Player interface in `src/types.ts`:

```typescript
export interface Player {
  id: string;
  name: string;
  score: number;
  hasDrawn: boolean;
  avatar?: string;
  isDisconnected?: boolean;
}
```

**Step 3: Commit**

```bash
git add src/index.ts src/types.ts
git commit -m "feat: add isDisconnected flag to Player type"
```

---

## Task 3: Refactor Server Connection Handling

**Files:**
- Modify: `src/index.ts:384-395` (websocket handlers)
- Modify: `src/index.ts:405-421` (fetch/upgrade)

**Step 1: Update WebSocket open handler**

Replace the websocket open handler (around line 385):

```typescript
websocket: {
  open(ws: ServerWebSocket<WebSocketData>) {
    console.log('Socket connected:', ws.data.id);
    clients.set(ws.data.id, ws);
  },
```

**Step 2: Update the fetch handler to pass sessionId**

Replace the `/ws` upgrade logic (lines 408-421):

```typescript
if (url.pathname === '/ws') {
  const socketId = generateId();
  const sessionId = url.searchParams.get('sessionId');

  const upgraded = server.upgrade(req, {
    data: {
      id: socketId,
      sessionId: sessionId,
      gameId: null,
    } as WebSocketData,
  });

  if (upgraded) {
    return undefined;
  }
  return new Response('WebSocket upgrade failed', { status: 500 });
}
```

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: accept sessionId from client during WebSocket upgrade"
```

---

## Task 4: Implement Session Management Functions

**Files:**
- Modify: `src/index.ts` (add after helper functions, around line 82)

**Step 1: Add session helper functions**

Add after the `sendTo` function (after line 82):

```typescript
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
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add session management helper functions"
```

---

## Task 5: Rewrite Disconnect Handler

**Files:**
- Modify: `src/index.ts:201-226`

**Step 1: Replace handleDisconnect function**

Replace the entire handleDisconnect function:

```typescript
function handleDisconnect(ws: ServerWebSocket<WebSocketData>) {
  const { id: socketId, sessionId, gameId } = ws.data;
  console.log('Socket disconnected:', socketId, 'session:', sessionId);

  clients.delete(socketId);

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
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement graceful disconnect with 30s cleanup timer"
```

---

## Task 6: Update createGame and joinGame Handlers

**Files:**
- Modify: `src/index.ts:238-274`

**Step 1: Update createGame handler**

Replace the createGame case (lines 238-245):

```typescript
case 'createGame': {
  const { playerName, isPrivate, avatar, sessionId: clientSessionId } = data;

  if (!clientSessionId) {
    sendTo(socketId, 'error', 'Session ID required');
    return;
  }

  const session = getOrCreateSession(clientSessionId);
  bindSessionToSocket(session, ws);

  const gameId = generateId();
  const game = createGame(gameId, clientSessionId, playerName, isPrivate, avatar);

  session.gameId = gameId;
  session.playerName = playerName;
  session.avatar = avatar;
  ws.data.sessionId = clientSessionId;
  ws.data.gameId = gameId;

  sendTo(socketId, 'gameCreated', {
    gameId,
    sessionId: clientSessionId,
    game: getGameState(game)
  });
  break;
}
```

**Step 2: Update joinGame handler**

Replace the joinGame case (lines 247-275):

```typescript
case 'joinGame': {
  const { gameId, playerName, avatar, sessionId: clientSessionId } = data;
  const game = games.get(gameId);

  if (!game) {
    sendTo(socketId, 'error', 'Game not found');
    return;
  }

  if (!clientSessionId) {
    sendTo(socketId, 'error', 'Session ID required');
    return;
  }

  const session = getOrCreateSession(clientSessionId);
  bindSessionToSocket(session, ws);

  // Check if this player is already in the game (reconnecting)
  const existingPlayer = game.players.get(clientSessionId);
  if (existingPlayer) {
    // Reconnecting - restore player
    existingPlayer.isDisconnected = false;
    session.gameId = gameId;
    ws.data.sessionId = clientSessionId;
    ws.data.gameId = gameId;

    cancelGameCleanup(gameId);

    broadcast(gameId, 'playerReconnected', {
      playerId: clientSessionId,
      game: getGameState(game)
    });

    // Send full state to reconnecting player
    sendTo(socketId, 'rejoinSuccess', {
      gameId,
      sessionId: clientSessionId,
      game: getGameState(game),
      drawingData: game.drawingData,
      currentWord: game.currentDrawer === clientSessionId ? game.currentWord : null,
      wordHint: game.currentDrawer !== clientSessionId ?
        game.currentWord?.split('').map(char => char === ' ' ? '   ' : '_ ').join('').trim() : null
    });
    break;
  }

  if (game.started) {
    sendTo(socketId, 'error', 'Game already started');
    return;
  }

  game.players.set(clientSessionId, {
    id: clientSessionId,
    name: playerName,
    score: 0,
    hasDrawn: false,
    avatar,
    isDisconnected: false
  });

  session.gameId = gameId;
  session.playerName = playerName;
  session.avatar = avatar;
  ws.data.sessionId = clientSessionId;
  ws.data.gameId = gameId;

  cancelGameCleanup(gameId);

  broadcast(gameId, 'playerJoined', {
    player: game.players.get(clientSessionId),
    game: getGameState(game)
  });
  break;
}
```

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: update game handlers to use session-based identity"
```

---

## Task 7: Add rejoinGame Handler

**Files:**
- Modify: `src/index.ts` (add new case in handleMessage switch)

**Step 1: Add rejoinGame case after joinGame**

Add this case in the switch statement after joinGame:

```typescript
case 'rejoinGame': {
  const { sessionId: clientSessionId, gameId } = data;

  if (!clientSessionId) {
    sendTo(socketId, 'error', 'Session ID required');
    return;
  }

  const session = sessions.get(clientSessionId);
  const game = games.get(gameId);

  if (!game) {
    sendTo(socketId, 'error', { code: 'game_not_found', message: 'Game not found' });
    return;
  }

  if (!session || !game.players.has(clientSessionId)) {
    sendTo(socketId, 'error', { code: 'player_expired', message: 'Player session expired' });
    return;
  }

  // Reconnect the session
  bindSessionToSocket(session, ws);
  ws.data.sessionId = clientSessionId;
  ws.data.gameId = gameId;

  const player = game.players.get(clientSessionId)!;
  player.isDisconnected = false;

  cancelGameCleanup(gameId);

  broadcast(gameId, 'playerReconnected', {
    playerId: clientSessionId,
    game: getGameState(game)
  });

  // Send full state to reconnecting player
  sendTo(socketId, 'rejoinSuccess', {
    gameId,
    sessionId: clientSessionId,
    game: getGameState(game),
    started: game.started,
    drawingData: game.drawingData,
    currentWord: game.currentDrawer === clientSessionId ? game.currentWord : null,
    wordHint: game.currentDrawer !== clientSessionId && game.currentWord ?
      game.currentWord.split('').map(char => char === ' ' ? '   ' : '_ ').join('').trim() : null,
    currentDrawer: game.currentDrawer,
    timeLeft: game.timeLeft,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds
  });
  break;
}
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add rejoinGame handler for reconnection"
```

---

## Task 8: Add Ping/Pong Heartbeat

**Files:**
- Modify: `src/index.ts` (add pong handler and ping interval)

**Step 1: Add pong handler in switch statement**

Add this case in handleMessage switch:

```typescript
case 'pong': {
  // Client responded to ping - connection is alive
  // Could track last pong time here if needed
  break;
}
```

**Step 2: Add ping interval for each connection**

Update the websocket open handler:

```typescript
websocket: {
  open(ws: ServerWebSocket<WebSocketData>) {
    console.log('Socket connected:', ws.data.id);
    clients.set(ws.data.id, ws);

    // Start ping interval
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      } else {
        clearInterval(pingInterval);
      }
    }, PING_INTERVAL);

    // Store interval for cleanup (using a separate map)
    pingIntervals.set(ws.data.id, pingInterval);
  },
```

**Step 3: Add pingIntervals map and cleanup**

Add after the clients map declaration (around line 41):

```typescript
const pingIntervals = new Map<string, ReturnType<typeof setInterval>>();
```

Update handleDisconnect to clear ping interval (add at the start):

```typescript
function handleDisconnect(ws: ServerWebSocket<WebSocketData>) {
  const { id: socketId, sessionId, gameId } = ws.data;
  console.log('Socket disconnected:', socketId, 'session:', sessionId);

  // Clear ping interval
  const pingInterval = pingIntervals.get(socketId);
  if (pingInterval) {
    clearInterval(pingInterval);
    pingIntervals.delete(socketId);
  }

  clients.delete(socketId);
  // ... rest of function
```

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add ping/pong heartbeat for connection health"
```

---

## Task 9: Update createGame Function to Use Session ID

**Files:**
- Modify: `src/index.ts:84-109`

**Step 1: Update createGame function signature and implementation**

Replace the createGame function:

```typescript
function createGame(gameId: string, sessionId: string, creatorName: string, isPrivate: boolean, avatar?: string): Game {
  const game: Game = {
    id: gameId,
    players: new Map([[sessionId, {
      id: sessionId,
      name: creatorName,
      score: 0,
      hasDrawn: false,
      avatar,
      isDisconnected: false
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
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "refactor: createGame uses sessionId as player identifier"
```

---

## Task 10: Update Other Message Handlers to Use Session

**Files:**
- Modify: `src/index.ts` (draw, clearCanvas, guess handlers)

**Step 1: Update draw handler**

The draw handler needs to use sessionId. Update the draw case:

```typescript
case 'draw': {
  const { gameId, data: drawData } = data;
  const game = games.get(gameId);
  const sessionId = ws.data.sessionId;
  if (!game || !sessionId || game.currentDrawer !== sessionId) return;

  game.drawingData.push(drawData);

  // Broadcast to all except sender
  game.players.forEach((_, playerId) => {
    if (playerId !== sessionId) {
      const playerSession = sessions.get(playerId);
      if (playerSession?.socketId) {
        sendTo(playerSession.socketId, 'drawing', drawData);
      }
    }
  });
  break;
}
```

**Step 2: Update clearCanvas handler**

```typescript
case 'clearCanvas': {
  const { gameId } = data;
  const game = games.get(gameId);
  const sessionId = ws.data.sessionId;
  if (!game || !sessionId || game.currentDrawer !== sessionId) return;

  game.drawingData = [];
  broadcast(gameId, 'canvasCleared', null);
  break;
}
```

**Step 3: Update guess handler**

```typescript
case 'guess': {
  const { gameId, message: guessMessage } = data;
  const game = games.get(gameId);
  const sessionId = ws.data.sessionId;
  if (!game || !game.started || !sessionId) return;

  const player = game.players.get(sessionId);
  if (!player || sessionId === game.currentDrawer) return;

  const isCorrect = guessMessage.toLowerCase().trim() === game.currentWord?.toLowerCase();
  const isClose = !isCorrect && game.currentWord ? isCloseGuess(guessMessage, game.currentWord) : false;

  broadcast(gameId, 'chatMessage', {
    playerId: sessionId,
    playerName: player.name,
    message: guessMessage,
    isCorrect,
    isClose
  });

  if (isCorrect && !game.guessedPlayers.has(sessionId)) {
    game.guessedPlayers.add(sessionId);

    const timeBonus = Math.floor((game.timeLeft / ROUND_TIME) * 50);
    const points = POINTS_CORRECT + timeBonus;

    player.score += points;

    const drawer = game.currentDrawer ? game.players.get(game.currentDrawer) : null;
    if (drawer) drawer.score += 50;

    broadcast(gameId, 'correctGuess', {
      playerId: sessionId,
      playerName: player.name,
      points
    });

    broadcast(gameId, 'gameState', getGameState(game));

    // Count only connected players for "all guessed" check
    const connectedGuessers = Array.from(game.players.values())
      .filter(p => p.id !== game.currentDrawer && !p.isDisconnected);
    const guessedCount = connectedGuessers.filter(p => game.guessedPlayers.has(p.id)).length;

    if (guessedCount === connectedGuessers.length && connectedGuessers.length > 0) {
      setTimeout(() => nextTurn(game), 2000);
    }
  }
  break;
}
```

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "refactor: update game handlers to use sessionId"
```

---

## Task 11: Update broadcast Function for Sessions

**Files:**
- Modify: `src/index.ts:64-75`

**Step 1: Update broadcast to look up sockets via sessions**

Replace the broadcast function:

```typescript
function broadcast(gameId: string, type: string, data: any) {
  const game = games.get(gameId);
  if (!game) return;

  const message = JSON.stringify({ type, data });
  game.players.forEach((_, playerId) => {
    const session = sessions.get(playerId);
    if (session?.socketId) {
      const client = clients.get(session.socketId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });
}
```

**Step 2: Update sendTo to work with both socketId and sessionId**

Add a new helper or update sendTo:

```typescript
function sendTo(socketId: string, type: string, data: any) {
  const client = clients.get(socketId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type, data }));
  }
}

function sendToSession(sessionId: string, type: string, data: any) {
  const session = sessions.get(sessionId);
  if (session?.socketId) {
    sendTo(session.socketId, type, data);
  }
}
```

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "refactor: update broadcast/send functions for session-based routing"
```

---

## Task 12: Client - Add Session Management

**Files:**
- Modify: `src/App.tsx:17-48`

**Step 1: Add sessionId state and localStorage logic**

Add after the existing state declarations (around line 44):

```typescript
const [sessionId] = useState<string>(() => {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sessionId', id);
  }
  return id;
});
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: client generates and persists sessionId"
```

---

## Task 13: Client - Add Connection State

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add connection state types and state**

Add near the top of the App component (after sessionId):

```typescript
type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
const [reconnectAttempt, setReconnectAttempt] = useState(0);
const maxReconnectAttempts = 10;
const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const socketRef = useRef<WebSocket | null>(null);
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add connection state tracking to client"
```

---

## Task 14: Client - Implement Reconnection Logic

**Files:**
- Modify: `src/App.tsx:85-239`

**Step 1: Replace the WebSocket connection useEffect**

Replace the entire WebSocket useEffect (lines 85-239):

```typescript
const connectWebSocket = useCallback(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;

  console.log('Connecting to WebSocket...', wsUrl);
  const newSocket = new WebSocket(wsUrl);
  socketRef.current = newSocket;

  newSocket.onopen = () => {
    console.log('WebSocket connected');
    setSocket(newSocket);
    setConnectionState('connected');
    setReconnectAttempt(0);

    // If we were in a game, try to rejoin
    if (currentGameId && screen !== 'home') {
      newSocket.send(JSON.stringify({
        type: 'rejoinGame',
        data: { sessionId, gameId: currentGameId }
      }));
    }
  };

  newSocket.onmessage = (event) => {
    const { type, data }: WebSocketMessage = JSON.parse(event.data);

    switch (type) {
      case 'ping': {
        newSocket.send(JSON.stringify({ type: 'pong' }));
        break;
      }

      case 'rejoinSuccess': {
        const { gameId, game, started, drawingData, currentWord, wordHint, currentDrawer, timeLeft, roundNumber, totalRounds } = data;
        setCurrentGameId(gameId);
        setPlayers(game.players);
        setGameStarted(started);

        if (started) {
          setScreen('game');
          setCurrentDrawer(currentDrawer);
          setIsDrawer(currentDrawer === sessionId);
          setTimeLeft(timeLeft);
          setRoundNumber(roundNumber);
          setTotalRounds(totalRounds);
          if (currentWord) setCurrentWord(currentWord);
          if (wordHint) setWordHint(wordHint);

          // Replay drawing data
          if (drawingData && drawingData.length > 0) {
            setTimeout(() => {
              drawingData.forEach((d: DrawData) => drawOnCanvas(d));
            }, 100);
          }
        } else {
          setScreen('lobby');
        }
        break;
      }

      case 'playerDisconnected': {
        const { game } = data;
        setPlayers(game.players);
        break;
      }

      case 'playerReconnected': {
        const { game } = data;
        setPlayers(game.players);
        break;
      }

      case 'gameCreated': {
        const { gameId, game, sessionId: returnedSessionId } = data;
        setCurrentGameId(gameId);
        setPlayers(game.players);
        setSocketId(returnedSessionId);
        socketIdRef.current = returnedSessionId;
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
        setIsDrawer(drawerId === sessionId);
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
        if (typeof data === 'object' && data.code === 'game_not_found') {
          // Game was deleted, go home
          setScreen('home');
          setCurrentGameId('');
          setPlayers([]);
        } else if (typeof data === 'object' && data.code === 'player_expired') {
          // Session expired, go home
          setScreen('home');
          setCurrentGameId('');
          setPlayers([]);
          alert('Your session expired. Please rejoin the game.');
        } else {
          alert(typeof data === 'string' ? data : data.message);
        }
        break;
      }
    }
  };

  newSocket.onclose = () => {
    console.log('WebSocket disconnected');
    setSocket(null);
    socketRef.current = null;

    if (connectionState !== 'disconnected') {
      attemptReconnect();
    }
  };

  newSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return newSocket;
}, [sessionId, currentGameId, screen, connectionState]);

const attemptReconnect = useCallback(() => {
  if (reconnectAttempt >= maxReconnectAttempts) {
    setConnectionState('disconnected');
    return;
  }

  setConnectionState('reconnecting');
  const attempt = reconnectAttempt + 1;
  setReconnectAttempt(attempt);

  // Exponential backoff: 0, 1000, 2000, 4000, 8000, 10000, 10000...
  const delays = [0, 1000, 2000, 4000, 8000, 10000, 10000, 10000, 10000, 10000];
  const delay = delays[Math.min(attempt - 1, delays.length - 1)];

  console.log(`Reconnecting in ${delay}ms (attempt ${attempt}/${maxReconnectAttempts})`);

  reconnectTimeoutRef.current = setTimeout(() => {
    connectWebSocket();
  }, delay);
}, [reconnectAttempt, maxReconnectAttempts, connectWebSocket]);

const manualReconnect = useCallback(() => {
  setReconnectAttempt(0);
  setConnectionState('connecting');
  connectWebSocket();
}, [connectWebSocket]);

useEffect(() => {
  connectWebSocket();

  return () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
  };
}, []); // Only run once on mount
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: implement WebSocket reconnection with exponential backoff"
```

---

## Task 15: Client - Update emit and Game Actions

**Files:**
- Modify: `src/App.tsx:242-266`

**Step 1: Update emit to use socketRef**

Replace the emit function and game action functions:

```typescript
const emit = useCallback((type: string, data: any) => {
  const ws = socketRef.current;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}, []);

const createGame = useCallback(() => {
  if (!playerName.trim()) return;
  emit('createGame', { playerName, isPrivate: false, avatar, sessionId });
}, [playerName, avatar, sessionId, emit]);

const joinGame = useCallback(() => {
  if (!playerName.trim() || !gameId.trim()) return;
  emit('joinGame', { gameId, playerName, avatar, sessionId });
  setCurrentGameId(gameId);
  setScreen('lobby');
}, [playerName, gameId, avatar, sessionId, emit]);

const startGame = useCallback(() => {
  const customWordsList = customWords.trim()
    ? customWords.split(/[,\n]+/).map(w => w.trim()).filter(w => w.length > 0)
    : [];
  emit('startGame', { gameId: currentGameId, totalRounds, roundTime, customWords: customWordsList });
}, [currentGameId, totalRounds, roundTime, customWords, emit]);
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: update emit and game actions to include sessionId"
```

---

## Task 16: Create ConnectionStatus Component

**Files:**
- Create: `src/components/ConnectionStatus.tsx`

**Step 1: Create the component**

```typescript
import { AlertTriangle, WifiOff } from 'lucide-react';

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionStatusProps {
  state: ConnectionState;
  attempt: number;
  maxAttempts: number;
  onRetry: () => void;
}

export function ConnectionStatus({ state, attempt, maxAttempts, onRetry }: ConnectionStatusProps) {
  if (state === 'connected' || state === 'connecting') {
    return null;
  }

  if (state === 'reconnecting') {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-center gap-2 z-50">
        <AlertTriangle className="w-4 h-4" />
        <span>Reconnecting... (attempt {attempt}/{maxAttempts})</span>
      </div>
    );
  }

  if (state === 'disconnected') {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 z-50">
        <WifiOff className="w-4 h-4" />
        <span>Connection lost</span>
        <button
          onClick={onRetry}
          className="ml-2 px-3 py-1 bg-white text-red-500 rounded text-sm font-medium hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
```

**Step 2: Commit**

```bash
git add src/components/ConnectionStatus.tsx
git commit -m "feat: create ConnectionStatus component"
```

---

## Task 17: Integrate ConnectionStatus into App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import and render ConnectionStatus**

Add import at top:

```typescript
import { ConnectionStatus } from './components/ConnectionStatus';
```

Add to the return statement, wrapping everything:

```typescript
return (
  <>
    <ConnectionStatus
      state={connectionState}
      attempt={reconnectAttempt}
      maxAttempts={maxReconnectAttempts}
      onRetry={manualReconnect}
    />
    {/* Rest of existing JSX */}
  </>
);
```

**Step 2: Add padding to body when banner is shown**

Update the screen returns to add top padding when disconnected/reconnecting:

```typescript
const bannerPadding = connectionState === 'reconnecting' || connectionState === 'disconnected'
  ? 'pt-10' : '';

if (screen === 'home') {
  return (
    <>
      <ConnectionStatus
        state={connectionState}
        attempt={reconnectAttempt}
        maxAttempts={maxReconnectAttempts}
        onRetry={manualReconnect}
      />
      <div className={bannerPadding}>
        <HomeScreen ... />
      </div>
    </>
  );
}
```

Apply similar pattern to other screens.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate ConnectionStatus banner into App"
```

---

## Task 18: Update Player List to Show Disconnected State

**Files:**
- Modify: `src/screens/LobbyScreen.tsx` (if player list is there)
- Modify: `src/screens/GameScreen.tsx` (if player list is there)

**Step 1: Find and update player list rendering**

In the player list, add visual indicator for disconnected players:

```typescript
{players.map((player) => (
  <div
    key={player.id}
    className={`flex items-center gap-2 ${player.isDisconnected ? 'opacity-50' : ''}`}
  >
    <span className={`w-2 h-2 rounded-full ${player.isDisconnected ? 'bg-yellow-500' : 'bg-green-500'}`} />
    <span>{player.name}</span>
    {player.isDisconnected && <span className="text-xs text-yellow-600">(reconnecting...)</span>}
    <span className="text-gray-500">({player.score} pts)</span>
  </div>
))}
```

**Step 2: Commit**

```bash
git add src/screens/LobbyScreen.tsx src/screens/GameScreen.tsx
git commit -m "feat: show disconnected player status in player list"
```

---

## Task 19: Disable Interactions When Disconnected

**Files:**
- Modify: `src/App.tsx`

**Step 1: Pass disabled state to screens**

Add a computed disabled state:

```typescript
const isDisconnected = connectionState === 'reconnecting' || connectionState === 'disconnected';
```

Pass to GameScreen:

```typescript
<GameScreen
  // ... existing props
  disabled={isDisconnected}
/>
```

**Step 2: Update GameScreen to use disabled prop**

In GameScreen, disable canvas events and chat input when disabled:

```typescript
interface GameScreenProps {
  // ... existing props
  disabled?: boolean;
}

// In canvas:
onMouseDown={disabled ? undefined : startDrawing}
onMouseMove={disabled ? undefined : draw}
onMouseUp={disabled ? undefined : stopDrawing}
style={{ cursor: disabled ? 'not-allowed' : (isDrawer ? 'crosshair' : 'default') }}

// In chat input:
<input
  disabled={disabled || isDrawer}
  // ...
/>
```

**Step 3: Commit**

```bash
git add src/App.tsx src/screens/GameScreen.tsx
git commit -m "feat: disable interactions when disconnected"
```

---

## Task 20: Final Testing and Cleanup

**Step 1: Build and verify no TypeScript errors**

```bash
bun run build
```

**Step 2: Test manually**

1. Start the server: `bun run dev`
2. Open two browser windows
3. Create a game in one, join in another
4. Disconnect one (close tab or disable network)
5. Verify player shows as "reconnecting"
6. Reconnect within 30 seconds - should restore
7. Wait 30+ seconds - should be removed

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete WebSocket reconnection implementation"
```

---

## Summary

This implementation adds:
- Session-based player identity (persisted in localStorage)
- 30-second grace period for disconnected players and empty lobbies
- Automatic reconnection with exponential backoff (up to 10 attempts)
- Visual connection status banner
- Player list showing disconnected state
- Disabled interactions during reconnection
- Ping/pong heartbeat for connection health
