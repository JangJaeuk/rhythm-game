import { useCallback, useEffect, useState } from "react";
import { GameEngine } from "../game/GameEngine";
import { createNotes } from "../game/utils";

export function useGame(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<
    "idle" | "playing" | "paused" | "ended"
  >("idle");
  const [isPaused, setIsPaused] = useState(false);

  const startGame = useCallback(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    const testNotes = createNotes();
    engine.setNotes(testNotes);
    engine.start();

    setGameEngine(engine);
    setGameState("playing");
  }, [canvasRef]);

  const pauseGame = useCallback(() => {
    if (gameEngine && gameState === "playing") {
      gameEngine.pause();
      setIsPaused(true);
      setGameState("paused");
    }
  }, [gameEngine, gameState]);

  const resumeGame = useCallback(() => {
    if (gameEngine && gameState === "paused") {
      gameEngine.resume();
      setIsPaused(false);
      setGameState("playing");
    }
  }, [gameEngine, gameState]);

  const exitGame = useCallback(() => {
    if (gameEngine) {
      gameEngine.stop();
      setGameEngine(null);
      setIsPaused(false);
      setGameState("idle");
    }
  }, [gameEngine]);

  useEffect(() => {
    return () => {
      if (gameEngine) {
        gameEngine.stop();
      }
    };
  }, [gameEngine]);

  return {
    startGame,
    pauseGame,
    resumeGame,
    exitGame,
    gameState,
    isPaused,
  };
}
