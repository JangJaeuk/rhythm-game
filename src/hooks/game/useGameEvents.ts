import { RefObject, useEffect } from "react";
import { GameEngine } from "../../engine/GameEngine";

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
  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPlaying) {
        pauseGame();
      } else if (e.key === "Escape" && isPaused) {
        setShowHowToPlay(false);
        await resumeGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isPaused, pauseGame, resumeGame, setShowHowToPlay]);

  // 마우스 클릭 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gameEngine) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 일시정지 버튼 클릭 체크
    if (isPlaying && gameEngine.isPauseButtonClicked(x, y)) {
      pauseGame();
    }
  };

  return {
    handleCanvasClick,
  };
}
