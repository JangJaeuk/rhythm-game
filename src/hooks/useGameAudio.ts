import { RefObject } from "react";

interface UseGameAudioReturn {
  waitForAudioStart: () => Promise<void>;
  playAudio: () => Promise<void>;
  pauseAudio: () => void;
  resetAudio: () => void;
  loadAudio: () => void;
}

export function useGameAudio(
  audioRef: RefObject<HTMLAudioElement>
): UseGameAudioReturn {
  const waitForAudioStart = async (): Promise<void> => {
    if (!audioRef.current) return;

    return new Promise((resolve) => {
      const check = () => {
        const currentTime = audioRef.current?.currentTime;
        if (currentTime !== undefined && currentTime >= 0) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  };

  const playAudio = async () => {
    if (!audioRef.current) return;
    await audioRef.current.play();
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  const resetAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  const loadAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.load();
  };

  return {
    waitForAudioStart,
    playAudio,
    pauseAudio,
    resetAudio,
    loadAudio,
  };
}
