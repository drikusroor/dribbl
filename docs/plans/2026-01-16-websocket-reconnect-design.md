# WebSocket Auto-Reconnect & Lobby Persistence Design

## Overview

Add automatic reconnection for dropped WebSocket connections and graceful lobby persistence so players can rejoin after brief network interruptions.

## Requirements

- **Player timeout:** 30 seconds before a disconnected player is removed
- **Lobby timeout:** 30 seconds before an empty lobby is deleted
- **Reconnection:** Automatic with exponential backoff (~10 attempts)
- **UI feedback:** Subtle banner, game visible but disabled during reconnect
- **Session persistence:** Preserve player identity (name, avatar, score) on reconnect

## Design

### 1. Session Management

#### Session Token Approach

When a player first connects, the client generates a unique session ID (UUID) and stores it in `localStorage`. This ID is sent with every `createGame` or `joinGame` message.

```
Client connects → Check localStorage for sessionId
  → If none, generate new UUID and store it
  → Send sessionId with createGame/joinGame
```

#### Server-side player tracking

The server tracks players by `sessionId` instead of `socketId`. The tracking structure becomes:

```typescript
interface Session {
  sessionId: string;
  socketId: string | null;
  ws: ServerWebSocket | null;
  gameId: string | null;
  disconnectedAt: number | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const sessions = new Map<string, Session>();
```

When a player disconnects:
- Mark them as `disconnectedAt: Date.now()` instead of removing immediately
- Keep their `Player` data in the game (name, avatar, score)
- Start a 30-second cleanup timer

When a player reconnects with the same `sessionId`:
- Update their `socketId` and `ws` reference
- Clear `disconnectedAt`
- Cancel cleanup timer
- Send current game state to resync them

### 2. Client Reconnection Logic

#### Exponential backoff schedule

```
Attempt 1: immediate
Attempt 2: 1 second delay
Attempt 3: 2 seconds
Attempt 4: 4 seconds
Attempt 5: 8 seconds
Attempts 6-10: 10 seconds each (cap)
```

Total time before giving up: ~60 seconds.

#### State machine

```
CONNECTED → (socket closes) → RECONNECTING → (success) → CONNECTED
                                    ↓
                              (max attempts)
                                    ↓
                              DISCONNECTED (show "Connection lost" with manual retry button)
```

#### On successful reconnect

1. Send `rejoinGame` message with `sessionId` and last known `gameId`
2. Server responds with either:
   - `gameState` - Full current state (you're back in!)
   - `error: "game_not_found"` - Game was deleted, return to home screen
   - `error: "player_expired"` - 30 seconds passed, rejoin as new player

#### Message queue during disconnect

Any actions the user attempts while disconnected (e.g., drawing strokes) are queued locally and sent once reconnected.

### 3. Server-Side Cleanup & Timeouts

#### Disconnected player handling

When a socket closes, instead of immediate removal:

```typescript
function handleDisconnect(ws) {
  const session = sessions.get(sessionId);
  session.disconnectedAt = Date.now();
  session.ws = null;

  // Mark player as disconnected in game (for UI)
  player.isDisconnected = true;
  broadcast(gameId, 'playerDisconnected', { playerId: sessionId });

  // Schedule cleanup
  session.cleanupTimer = setTimeout(() => {
    removePlayerPermanently(sessionId, gameId);
  }, 30_000);
}
```

#### Disconnected drawer handling

If the disconnected player was the current drawer, skip their turn after a 5-second grace period to keep the game flowing for others.

#### Empty lobby cleanup

When the last player disconnects, the game enters a "zombie" state:
- 30-second timer starts
- If anyone reconnects, timer cancels and game continues
- If timer expires, game is deleted permanently

#### Heartbeat ping/pong

Server sends `ping` every 15 seconds. If no `pong` received within 5 seconds, consider connection dead and trigger disconnect flow. This catches "silent" disconnects faster than waiting for TCP timeout.

### 4. UI Feedback

#### Connection state indicator

A subtle banner appears at the top of the screen when disconnected:

```
┌─────────────────────────────────────────────┐
│ ⚠ Reconnecting... (attempt 2/10)            │
└─────────────────────────────────────────────┘
```

#### Visual states

| State | Banner | UI Behavior |
|-------|--------|-------------|
| Connected | None (or small green dot) | Fully interactive |
| Reconnecting | Yellow "Reconnecting..." | Visible but disabled, slight opacity |
| Disconnected | Red "Connection lost" + retry button | Disabled |

#### Interaction blocking

During reconnect, disable:
- Drawing on canvas (show cursor change)
- Sending guesses/chat
- Starting game / changing settings

But keep visible:
- Current drawing
- Player list
- Chat history
- Timer (frozen or showing "paused")

#### Player list shows disconnected players

```
Players:
  🟢 Alice (120 pts)
  🟡 Bob (80 pts) - reconnecting...
  🟢 You (95 pts)
```

## Implementation

### Files to modify

| File | Changes |
|------|---------|
| `src/index.ts` | Session tracking, cleanup timers, `rejoinGame` handler, ping/pong |
| `src/App.tsx` | Reconnection logic, session storage, connection state management |
| `src/components/ConnectionStatus.tsx` | New component for banner UI |
| `src/types.ts` | Add `isDisconnected` to Player, new message types |
| `src/screens/*.tsx` | Disable interactions when disconnected |

### New message types

```
Client → Server:
  rejoinGame { sessionId, gameId }
  pong {}

Server → Client:
  playerDisconnected { playerId }
  playerReconnected { playerId }
  ping {}
```

### Implementation order

1. Add sessionId to client (localStorage) and send with join/create
2. Refactor server to track sessions instead of sockets
3. Add disconnect grace period and cleanup timers
4. Add `rejoinGame` handler on server
5. Add client reconnection logic with backoff
6. Add ping/pong heartbeat
7. Add ConnectionStatus UI component
8. Update player list to show disconnected state
9. Disable interactions during reconnect
