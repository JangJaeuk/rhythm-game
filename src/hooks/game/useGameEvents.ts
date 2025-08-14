import { RefObject } from "react";
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
  useEventHandler({
    keyboardHandlers: [
      {
        key: "Escape",
        handler: async () => {
          if (isPlaying) {
            pauseGame();
          } else if (isPaused) {
            setShowHowToPlay(false);
            await resumeGame();
          }
        },
      },
    ],
    clickHandler: gameEngine
      ? {
          element: canvasRef,
          handler: (x, y) => {
            if (isPlaying && gameEngine.isPauseButtonClicked(x, y)) {
              pauseGame();
            }
          },
        }
      : undefined,
  });

  // React의 이벤트 시스템을 위한 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gameEngine) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isPlaying && gameEngine.isPauseButtonClicked(x, y)) {
      pauseGame();
    }
  };

  return {
    handleCanvasClick,
  };
}
