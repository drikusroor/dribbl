# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start development server with hot reload
bun start            # Production server (NODE_ENV=production)
bun run build.ts     # Build frontend (outputs to dist/)
bun run lint         # Run Biome.js linter
bun run lint:fix     # Auto-fix lint issues
bun run lint:unsafe  # Run Biome.js linter with unsafe fixes
bun run check-types  # Run type checking with TypeScript (tsc)
```

Docker: `docker-compose up --build`

## Architecture

Dribbl is a multiplayer draw-and-guess game built with Bun, React 19, Express 5, and Socket.io.

### Stack

- **Runtime:** Bun (JavaScript runtime, bundler, package manager)
- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Backend:** Express 5 with WebSocket (Socket.io)
- **Audio:** ZzFX procedural sound generator (~1KB)

### Key Files

- `src/index.ts` - Server entry point (Express + WebSocket handlers, game state management)
- `src/App.tsx` - Main React component with WebSocket client logic
- `src/frontend.tsx` - React DOM mount point
- `build.ts` - Bun bundler configuration with Tailwind plugin

### Client-Server Communication

WebSocket messages use `{ type, data }` JSON format. The server maintains:

- `games` Map - Active game state (players, drawing data, timer, current word)
- `sessions` Map - Client sessions with 30-second timeout for reconnection
- `clients` Map - WebSocket connections indexed by playerId

Session persistence: Client stores `sessionId` in localStorage for auto-reconnect on network failure.

### Game Flow

1. **HomeScreen** - Player name/avatar setup, join or create game
2. **LobbyScreen** - Wait for players, host starts game
3. **GameScreen** - Canvas drawing (drawer) + chat guessing (others), 60s rounds
4. **GameOverScreen** - Staggered scoreboard reveal with sounds

### Guess Validation

`src/util/is-close-guess.ts` uses Levenshtein distance to detect "close" guesses (edit distance ≤2 or >70% similarity).

### Audio System

`src/lib/zzfx.ts` defines 12+ procedural sounds. `SoundContext` provides global access with localStorage-persisted mute state. Draw sound is throttled to 100ms intervals.

### Screen Components

Located in `src/screens/` - each manages its own state and receives game data via props from App.tsx.

## Docker Notes

Uses Bun baseline build for compatibility with older CPUs (Synology NAS, processors without AVX2). Switch to `oven/bun:1` for better performance on modern hardware.
