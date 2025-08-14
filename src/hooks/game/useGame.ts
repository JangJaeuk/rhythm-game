import { useCallback, useEffect, useRef } from "react";
import { GameEngine } from "../../engine/GameEngine";
import { getNotes } from "../../engine/utils/note";
import { useAudioControl } from "../audio/useAudioControl";
import { useGameScore } from "./useGameScore";
import { useGameState } from "./useGameState";

interface UseGameProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export function useGame({ canvasRef, audioRef }: UseGameProps) {
  const gameEngine = useRef<GameEngine | null>(null);
  const gameState = useGameState();
  const gameScore = useGameScore();
  const audioControl = useAudioControl(audioRef);

  const handleGameEnd = useCallback(() => {
    if (!gameEngine.current) return;

    const scoreInfo = gameEngine.current.getScoreInfo();
    gameScore.updateScore(scoreInfo.score);
    gameScore.updateCombo(scoreInfo.maxCombo);

    // 각 판정 카운트를 실제 값으로 한 번에 업데이트
    gameScore.updateCounts("perfect", scoreInfo.perfectCount);
    gameScore.updateCounts("good", scoreInfo.goodCount);
    gameScore.updateCounts("normal", scoreInfo.normalCount);
    gameScore.updateCounts("miss", scoreInfo.missCount);

    gameState.endGame();
  }, [gameScore, gameState]);

  const startGame = useCallback(
    async (musicId: string) => {
      if (!canvasRef.current || !audioRef.current) return;

      const engine = new GameEngine(
        canvasRef.current,
        audioRef.current,
        handleGameEnd
      );
      const notes = getNotes(musicId);

      engine.setNotes(notes);
      engine.start();

      gameEngine.current = engine;
      gameState.startGame();

      await audioControl.play();
      await audioControl.waitForStart();
    },
    [audioControl, gameState, handleGameEnd]
  );

  const pauseGame = useCallback(() => {
    if (gameEngine.current && gameState.isPlaying) {
      gameEngine.current.pause();
      audioControl.pause();
      gameState.pauseGame();
    }
  }, [audioControl, gameState]);

  const resumeGame = useCallback(async () => {
    if (gameEngine.current && gameState.isPaused) {
      await audioControl.play();
      gameEngine.current.resume();
      gameState.resumeGame();
    }
  }, [audioControl, gameState]);

  const exitGame = useCallback(() => {
    if (gameEngine.current) {
      gameEngine.current.stop();
      audioControl.reset();
      gameState.setState("idle");
      gameScore.resetScore();
    }
  }, [audioControl, gameState, gameScore]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameEngine.current) {
        gameEngine.current.stop();
        gameEngine.current.destroy();
      }
    };
  }, []);

  return {
    ...gameState,
    ...gameScore,
    gameEngine: gameEngine.current,
    startGame,
    pauseGame,
    resumeGame,
    exitGame,
  };
}
