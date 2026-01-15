# 8-Bit Sound System Design

**Date:** 2026-01-15
**Feature:** Generated 8-bit sounds for game actions with audio toggle

## Overview

Add retro 8-bit sound effects to enhance the Pictionary-style gameplay experience. Sounds will be programmatically generated using ZzFX library and controlled via a persistent audio toggle.

## Requirements

- Generate 8-bit sounds for game actions: typing, guessing (correct/wrong/close), drawing, round start, game over, player joined, word revealed
- Provide intuitive audio toggle button (on/off)
- Persist audio preference across sessions
- Keep bundle size minimal

## Technology Choice

**Library:** ZzFX (~1KB)
- Tiny sound generator that creates 8-bit sounds programmatically
- No audio files needed - sounds defined as parameter arrays
- Perfect for retro game sounds
- Used in many js13k games

**Rejected alternatives:**
- jsfxr: Larger, more complex than needed
- Tone.js: Overkill (~150KB) for simple 8-bit sounds

## Architecture

### Component Structure

```
src/
├── contexts/
│   └── SoundContext.tsx          # Provider + Context + useSounds hook
├── components/
│   └── AudioToggle.tsx            # Mute/unmute button UI
├── lib/
│   └── zzfx.ts                    # ZzFX library + sound definitions
└── App.tsx                        # Wrapped with SoundProvider
```

### Sound Context Pattern

```typescript
// Provider wraps entire app
<SoundProvider>
  <App />
</SoundProvider>

// Usage in any component
const { playCorrect, playWrong, isMuted, toggleMute } = useSounds();
```

### Audio Toggle Component

- **Location:** Fixed position, top-right corner, all screens
- **Icons:** Lucide `Volume2` (unmuted) / `VolumeX` (muted)
- **Styling:** Matches existing gradient/shadow theme
- **Persistence:** localStorage key `dribbl-audio-muted`
- **Position:** `fixed top-4 right-4 z-50`

## Sound Definitions

### 1. UI/Typing Sounds
- **Chat typing**: Short high-pitched blip (440Hz, 0.05s)
- **Button clicks**: Quick pop (330Hz, 0.03s)

### 2. Guessing Feedback
- **Correct guess**: Cheerful ascending arpeggio (C-E-G, 0.4s)
- **Wrong guess**: Low buzzer (110Hz, 0.2s) with distortion
- **Close guess**: Mid-tone ding (550Hz, 0.15s)

### 3. Drawing Interaction
- **Pencil stroke**: Soft white noise sweep (0.03s, throttled to 100ms)
- **Canvas clear**: Descending whoosh (800Hz → 200Hz, 0.3s)

### 4. Game Progression
- **Round start**: Three ascending beeps (440Hz, 523Hz, 659Hz)
- **Game over**: Victory fanfare (major chord progression, 1.2s)
- **Time warning**: Ticking clock (plays at 10s remaining)

### 5. Social Events
- **Player joined**: Ascending chirp (0.2s)
- **Word revealed**: Ta-da arpeggio (0.3s)

**Volume Balance:** All sounds normalized to 0.1-0.3 volume range.

## Sound Trigger Points

| Sound | Location | File | Line/Case |
|-------|----------|------|-----------|
| Round start | WebSocket handler | `App.tsx` | `case 'roundStart'` ~140 |
| Correct guess | WebSocket handler | `App.tsx` | `case 'correctGuess'` ~185 |
| Wrong guess | Message type check | `App.tsx` | Chat message handling ~175 |
| Close guess | Message type check | `App.tsx` | Yellow message ~175 |
| Draw stroke | Mouse move handler | `GameScreen.tsx` | `draw()` ~295 (throttled) |
| Canvas clear | Button click | `GameScreen.tsx` | `handleClearCanvas()` ~277 |
| Game over | WebSocket handler | `App.tsx` | `case 'gameOver'` ~212 |
| Time warning | Time effect | `App.tsx` | `timeLeft === 10` ~160 |
| Player joined | WebSocket handler | `App.tsx` | `case 'playerJoined'` ~118 |
| Word revealed | WebSocket handler | `App.tsx` | `case 'wordReveal'` ~195 |
| Chat typing | Input keyPress | `GameScreen.tsx` | Enter key ~336 |
| Button clicks | onClick handlers | Various | All interactive buttons |

## Edge Cases & Solutions

### 1. Browser Autoplay Policy
**Problem:** Modern browsers block audio until user interaction
**Solution:** First user click (Join/Create Game) serves as interaction trigger

### 2. Rapid-fire Draw Sounds
**Problem:** mouseMove generates many events while drawing
**Solution:** Throttle to max 1 sound per 100ms using timestamp check

### 3. Audio Context Cleanup
**Problem:** Memory leaks if context not disposed
**Solution:** Clean up audio context on component unmount

### 4. Preference Persistence
**Storage:** localStorage key `dribbl-audio-muted` (boolean)
**Default:** `false` (sounds enabled)

### 5. Concurrent Sounds
**Behavior:** ZzFX naturally handles overlapping sounds (acceptable)

## Performance Impact

- **Bundle size:** +1KB (ZzFX minified)
- **Memory:** Minimal - no audio file loading
- **Sound generation:** <1ms per sound (on-demand)
- **Context overhead:** Negligible

## Testing Checklist

- [ ] Each sound triggers at correct moment during gameplay
- [ ] Mute toggle persists across page refresh
- [ ] Sounds respect muted state
- [ ] No console errors or audio context warnings
- [ ] Test on Chrome, Firefox, Safari for autoplay compatibility
- [ ] Drawing sound throttle works (no audio spam)
- [ ] Multiple concurrent sounds don't cause issues

## Implementation Phases

1. **Phase 1:** Set up ZzFX + sound definitions
2. **Phase 2:** Create SoundContext + Provider
3. **Phase 3:** Build AudioToggle component
4. **Phase 4:** Integrate sound triggers throughout app
5. **Phase 5:** Test and polish

## Open Questions (Resolved)

- ✅ Library choice: ZzFX selected
- ✅ Audio control: Simple on/off toggle
- ✅ Toggle placement: Top-right corner, all screens
- ✅ State management: React Context
- ✅ Typing sound scope: Local user only
