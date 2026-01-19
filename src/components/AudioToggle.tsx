// src/components/AudioToggle.tsx

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSounds } from '../contexts/SoundContext';
import { playSound, SOUNDS } from '../lib/zzfx';

export const AudioToggle: React.FC = () => {
  const { isMuted, toggleMute } = useSounds();

  const handleToggle = () => {
    const willBeUnmuted = isMuted;
    toggleMute();
    if (willBeUnmuted) {
      // Play sound directly, bypassing mute check for toggle demonstration
      playSound(SOUNDS.click as any);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
      title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5 text-gray-700" />
      ) : (
        <Volume2 className="w-5 h-5 text-gray-700" />
      )}
    </button>
  );
};
