import { RefObject, useState } from "react";

interface UseAudioControlReturn {
  isPlaying: boolean;
  isLoaded: boolean;
  play: () => Promise<void>;
  pause: () => void;
  reset: () => void;
  load: () => void;
  waitForStart: () => Promise<void>;
}

export function useAudioControl(
  audioRef: RefObject<HTMLAudioElement>
): UseAudioControlReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const play = async () => {
    if (!audioRef.current) return;
    await audioRef.current.play();
    setIsPlaying(true);
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const reset = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const load = () => {
    if (!audioRef.current) return;
    audioRef.current.load();
    setIsLoaded(true);
  };

  const waitForStart = async (): Promise<void> => {
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

  return {
    isPlaying,
    isLoaded,
    play,
    pause,
    reset,
    load,
    waitForStart,
  };
}
