import { RefObject, useCallback } from "react";
import { GameEngine } from "../../engine/GameEngine";
import { useEventHandler } from "../core/useEventHandler";

interface UseGameEventsProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  gameEngine: GameEngine | null;
  isPlaying: boolean;
  isPaused: boolean;
  pauseGame: () => void;
  resumeGame: () => Promise<void>;
  setShowHowToPlay: (show: boolean) => void;
}

export function useGameEvents({
  canvasRef,
  gameEngine,
  isPlaying,
  isPaused,
  pauseGame,
  resumeGame,
  setShowHowToPlay,
}: UseGameEventsProps) {
  // 이벤트 핸들러 메모이제이션
  const handleEscape = useCallback(async () => {
    if (isPlaying) {
      pauseGame();
    } else if (isPaused) {
      setShowHowToPlay(false);
      await resumeGame();
    }
  }, [isPlaying, isPaused, pauseGame, resumeGame, setShowHowToPlay]);

  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      if (!gameEngine) return;
      if (isPlaying && gameEngine.isPauseButtonClicked(x, y)) {
        pauseGame();
      }
    },
    [gameEngine, isPlaying, pauseGame]
  );

  // 단일 이벤트 시스템 사용
  useEventHandler({
    keyboardHandlers: [{ key: "Escape", handler: handleEscape }],
    clickHandler: {
      element: canvasRef,
      handler: handleCanvasClick,
    },
  });

  return {
    handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
    },
  };
}
