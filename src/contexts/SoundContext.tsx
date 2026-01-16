// src/contexts/SoundContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { playSound, SOUNDS } from '../lib/zzfx';

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playClick: () => void;
  playTyping: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playClose: () => void;
  playDraw: () => void;
  playClear: () => void;
  playRoundStart: () => void;
  playGameOver: () => void;
  playTimeWarning: () => void;
  playPlayerJoined: () => void;
  playWordReveal: () => void;
  playDrumRoll: () => void;
  playRevealTick: () => void;
  playPodiumReveal: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const STORAGE_KEY = 'dribbl-audio-muted';

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const lastDrawSoundTime = useRef<number>(0);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setIsMuted(stored === 'true');
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isMuted));
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Helper to play sound only if not muted
  const playSafe = useCallback((soundParams: number[]) => {
    if (!isMuted) {
      playSound(soundParams);
    }
  }, [isMuted]);

  // Sound methods
  const playClick = useCallback(() => playSafe(SOUNDS.click), [playSafe]);
  const playTyping = useCallback(() => playSafe(SOUNDS.typing), [playSafe]);
  const playCorrect = useCallback(() => playSafe(SOUNDS.correct), [playSafe]);
  const playWrong = useCallback(() => playSafe(SOUNDS.wrong), [playSafe]);
  const playClose = useCallback(() => playSafe(SOUNDS.close), [playSafe]);
  const playClear = useCallback(() => playSafe(SOUNDS.clear), [playSafe]);
  const playRoundStart = useCallback(() => playSafe(SOUNDS.roundStart), [playSafe]);
  const playGameOver = useCallback(() => playSafe(SOUNDS.gameOver), [playSafe]);
  const playTimeWarning = useCallback(() => playSafe(SOUNDS.timeWarning), [playSafe]);
  const playPlayerJoined = useCallback(() => playSafe(SOUNDS.playerJoined), [playSafe]);
  const playWordReveal = useCallback(() => playSafe(SOUNDS.wordReveal), [playSafe]);
  const playDrumRoll = useCallback(() => playSafe(SOUNDS.drumRoll), [playSafe]);
  const playRevealTick = useCallback(() => playSafe(SOUNDS.revealTick), [playSafe]);
  const playPodiumReveal = useCallback(() => playSafe(SOUNDS.podiumReveal), [playSafe]);

  // Draw sound with throttling (max once per 100ms)
  const playDraw = useCallback(() => {
    const now = Date.now();
    if (now - lastDrawSoundTime.current >= 100) {
      playSafe(SOUNDS.draw);
      lastDrawSoundTime.current = now;
    }
  }, [playSafe]);

  const value: SoundContextType = {
    isMuted,
    toggleMute,
    playClick,
    playTyping,
    playCorrect,
    playWrong,
    playClose,
    playDraw,
    playClear,
    playRoundStart,
    playGameOver,
    playTimeWarning,
    playPlayerJoined,
    playWordReveal,
    playDrumRoll,
    playRevealTick,
    playPodiumReveal,
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSounds = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSounds must be used within SoundProvider');
  }
  return context;
};
