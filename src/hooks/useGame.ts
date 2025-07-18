import { useCallback, useEffect, useState } from "react";
import { GameEngine } from "../game/GameEngine";
import { getNotes } from "../game/utils";

export function useGame(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<
    "idle" | "playing" | "paused" | "ended"
  >("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [normalCount, setNormalCount] = useState(0);
  const [missCount, setMissCount] = useState(0);

  const startGame = useCallback((musicId: string) => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, audioRef.current, () => {
      setMaxCombo(engine.maxCombo);
      setScore(engine.score);
      setPerfectCount(engine.perfectCount);
      setGoodCount(engine.goodCount);
      setNormalCount(engine.normalCount);
      setMissCount(engine.missCount);
      setGameState("ended");
    });

    const testNotes = getNotes(musicId);
    engine.setNotes(testNotes);
    engine.start();

    setGameEngine(engine);
    setGameState("playing");
  }, []);

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
      // setGameEngine(null);
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
    maxCombo,
    score,
    perfectCount,
    goodCount,
    normalCount,
    missCount,
  };
}
