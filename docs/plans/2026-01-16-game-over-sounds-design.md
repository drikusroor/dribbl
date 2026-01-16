# Game Over Scoreboard Sounds Design

## Overview

Add celebratory sounds when the game ends and the scoreboard is displayed, with a staggered reveal from last place to first place building suspense to the winner announcement.

## Sound Sequence

```
Screen loads → Drum roll / tension builder
     ↓
Last place reveals → Quick tick sound
     ↓
... each position reveals with tick ...
     ↓
3rd place → Podium reveal sound (bronze)
     ↓
2nd place → Podium reveal sound (silver)
     ↓
1st place → Big triumphant fanfare (winner!)
```

## Sounds

| Sound | Purpose | Notes |
|-------|---------|-------|
| `drumRoll` | Tension builder on screen load | New sound |
| `revealTick` | Each 4th+ place reveal | New sound, quick percussive pop |
| `podiumReveal` | 2nd and 3rd place reveal | New sound, medium celebratory |
| `gameOver` | 1st place winner reveal | Existing sound, triumphant fanfare |

## Animation

- All player cards hidden initially (opacity 0)
- Drum roll plays immediately on mount
- After 800ms delay, reveals begin
- 600ms between each reveal
- Cards animate: fade in + slide up
- 1st/2nd/3rd place get subtle glow pulse on reveal

## Timing

```
0ms      → Screen mounts, playDrumRoll()
800ms    → First reveal (last place), playRevealTick()
1400ms   → Next reveal, playRevealTick()
...      → Continue for each player
???ms    → 3rd place, playPodiumReveal()
???ms    → 2nd place, playPodiumReveal()
???ms    → 1st place, playGameOver()
```

## Files to Modify

1. **`src/lib/zzfx.ts`**
   - Add `drumRoll` sound parameters
   - Add `revealTick` sound parameters
   - Add `podiumReveal` sound parameters

2. **`src/contexts/SoundContext.tsx`**
   - Add `playDrumRoll()` method
   - Add `playRevealTick()` method
   - Add `playPodiumReveal()` method
   - Export new methods in context interface

3. **`src/screens/GameOverScreen.tsx`**
   - Add `revealedCount` state for staggered animation
   - Add `useEffect` for timed reveal sequence
   - Trigger appropriate sounds at each reveal
   - Add CSS transitions for fade-in + slide-up
   - Add glow pulse animation for podium positions

## Visual Enhancements

- 4th+ place: Simple fade-in with tick
- 3rd place: Bronze glow pulse on reveal
- 2nd place: Silver glow pulse on reveal
- 1st place: Gold glow pulse + subtle scale pop on reveal
