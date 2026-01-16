// src/lib/zzfx.ts

/**
 * ZzFX - Tiny JavaScript Sound Generator
 * https://github.com/KilledByAPixel/ZzFX
 * Micro Edition - ~1KB
 */

// Fix 1: Singleton AudioContext to prevent memory leaks
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      throw new Error('Web Audio API not supported');
    }
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const zzfx = (
  volume = 1,
  randomness = 0.05,
  frequency = 220,
  attack = 0,
  sustain = 0,
  release = 0.1,
  shape = 0,
  shapeCurve = 1,
  vibrato = 0,
  vibratoFrequency = 10,
  decay = 0,
  minFrequency = 0,
  noise = 0,
  sampleRate = 44100,
  sampleRateScale = 1
): void => {
  // Check if audio is supported
  try {
    var context = getAudioContext();
  } catch (error) {
    console.warn('Web Audio API not supported');
    return;
  }

  // Calculate duration
  const duration = attack + sustain + release;

  // Fix 4: Validate duration
  if (duration <= 0) {
    console.warn('Invalid sound duration');
    return;
  }

  const length = Math.max(1, Math.floor(duration * sampleRate * sampleRateScale));

  // Fix 4: Error handling for buffer creation
  let buffer: AudioBuffer;
  try {
    buffer = context.createBuffer(1, length, sampleRate);
  } catch (error) {
    console.error('Failed to create audio buffer:', error);
    return;
  }
  const data = buffer.getChannelData(0);

  // Generate waveform
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate / sampleRateScale;

    // Calculate amplitude envelope
    let amplitude = 0;
    if (time < attack) {
      amplitude = time / attack;
    } else if (time < attack + sustain) {
      amplitude = 1;
    } else {
      amplitude = 1 - (time - attack - sustain) / release;
    }

    // Apply decay
    if (decay) {
      amplitude *= Math.exp(-decay * time);
    }

    // Calculate frequency with vibrato
    let currentFrequency = frequency;
    if (vibrato) {
      currentFrequency += Math.sin(time * vibratoFrequency * Math.PI * 2) * vibrato * frequency;
    }

    // Apply frequency decay (slide to minFrequency)
    if (minFrequency) {
      const slide = (minFrequency - frequency) / duration;
      currentFrequency = frequency + slide * time;
    }

    // Generate wave shape
    const phase = (currentFrequency * time * Math.PI * 2) % (Math.PI * 2);
    let sample = 0;

    switch (shape) {
      case 0: // Sine
        sample = Math.sin(phase);
        break;
      case 1: // Triangle
        sample = Math.abs((phase / Math.PI) % 2 - 1) * 2 - 1;
        break;
      case 2: // Sawtooth
        sample = (phase / Math.PI) % 2 - 1;
        break;
      case 3: // Square
        sample = phase < Math.PI ? 1 : -1;
        break;
      default:
        sample = Math.sin(phase);
    }

    // Add noise
    if (noise) {
      sample += (Math.random() * 2 - 1) * noise;
    }

    // Add randomness
    if (randomness) {
      sample += (Math.random() * 2 - 1) * randomness;
    }

    // Apply volume and envelope
    data[i] = sample * amplitude * volume;
  }

  // Play sound
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();

  // Fix 2: Cleanup after playback to prevent memory leaks
  source.onended = () => {
    source.disconnect();
  };
};

// Fix 3: Proper type definition for ZzFX parameters
type ZzFXParams = [
  volume?: number,
  randomness?: number,
  frequency?: number,
  attack?: number,
  sustain?: number,
  release?: number,
  shape?: number,
  shapeCurve?: number,
  vibrato?: number,
  vibratoFrequency?: number,
  decay?: number,
  minFrequency?: number,
  noise?: number,
  sampleRate?: number,
  sampleRateScale?: number
];

// Sound bank - each sound is an array of zzfx parameters
export const SOUNDS: Record<string, ZzFXParams> = {
  // UI Sounds
  click: [0.2, 0, 330, 0, 0.03, 0, 0, 0, 0, 0, 0, 0, 0, 44100, 1],
  typing: [0.15, 0, 440, 0, 0.05, 0, 0, 0, 0, 0, 0, 0, 0, 44100, 1],

  // Guessing sounds
  correct: [
    0.3, 0, 523, 0.02, 0.15, 0.1, 0, 1.5, 0, 0, 0, 0, 0, 44100, 1, // C note
  ],
  wrong: [0.25, 0.05, 110, 0, 0.2, 0, 2, 0.5, 0, 0, 0, 0, 0.1, 44100, 1],
  close: [0.2, 0, 550, 0, 0.15, 0, 0, 1, 0, 0, 0, 0, 0, 44100, 1],

  // Drawing sounds
  draw: [0.08, 0.1, 200, 0, 0.03, 0, 3, 0, 0, 0, 0, 0, 0.5, 44100, 1],
  clear: [0.2, 0, 800, 0, 0.3, 0, 1, 2, 0, 0, -20, 200, 0, 44100, 1],

  // Game progression
  roundStart: [0.25, 0, 659, 0.02, 0.12, 0.08, 0, 1.5, 0, 0, 0, 0, 0, 44100, 1],
  gameOver: [0.3, 0, 523, 0.05, 0.3, 0.2, 0, 1.5, 0, 0, 0, 0, 0, 44100, 1],
  timeWarning: [0.15, 0, 880, 0, 0.05, 0, 0, 0, 0, 0, 0, 0, 0, 44100, 1],

  // Social
  playerJoined: [0.2, 0, 440, 0.02, 0.2, 0.1, 0, 2, 5, 0, 0, 0, 0, 44100, 1],
  wordReveal: [0.25, 0, 659, 0.03, 0.15, 0.1, 0, 2, 8, 0, 0, 0, 0, 44100, 1],

  // Scoreboard reveal
  drumRoll: [0.15, 0.1, 150, 0.1, 0.6, 0.2, 3, 0, 0, 0, 0, 0, 0.4, 44100, 1],
  revealTick: [0.2, 0, 600, 0, 0.04, 0.02, 0, 0, 0, 0, 0, 0, 0, 44100, 1],
  podiumReveal: [0.25, 0, 523, 0.02, 0.1, 0.08, 0, 1.5, 0, 0, 0, 784, 0, 44100, 1],
};

// Helper to play a sound from the bank
export const playSound = (soundParams: ZzFXParams): void => {
  zzfx(...soundParams);
};
