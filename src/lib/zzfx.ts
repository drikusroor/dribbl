// src/lib/zzfx.ts

/**
 * ZzFX - Tiny JavaScript Sound Generator
 * https://github.com/KilledByAPixel/ZzFX
 * Micro Edition - ~1KB
 */

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
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
    console.warn('Web Audio API not supported');
    return;
  }

  // Create audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  // Calculate duration
  const duration = attack + sustain + release;
  const length = duration * sampleRate * sampleRateScale;

  // Create buffer
  const buffer = audioContext.createBuffer(1, length, sampleRate);
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
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
};

// Sound bank - each sound is an array of zzfx parameters
export const SOUNDS = {
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
};

// Helper to play a sound from the bank
export const playSound = (soundParams: number[]): void => {
  zzfx(...soundParams as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]);
};
