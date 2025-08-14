import { useState } from "react";

export type GameState = "idle" | "playing" | "paused" | "ended" | "countdown";

interface UseGameStateReturn {
  state: GameState;
  isPlaying: boolean;
  isPaused: boolean;
  isEnded: boolean;
  isCountdown: boolean;
  setState: (state: GameState) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  startCountdown: () => void;
}

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState>("idle");

  const startGame = () => setState("playing");
  const pauseGame = () => setState("paused");
  const resumeGame = () => setState("playing");
  const endGame = () => setState("ended");
  const startCountdown = () => setState("countdown");

  return {
    state,
    setState,
    isPlaying: state === "playing",
    isPaused: state === "paused",
    isEnded: state === "ended",
    isCountdown: state === "countdown",
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    startCountdown,
  };
}
