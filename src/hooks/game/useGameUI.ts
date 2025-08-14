import { useState } from "react";

interface UseGameUIProps {
  exitGame: () => void;
  saveScore: (musicId: string, onSave?: () => void) => void;
}

export function useGameUI({ exitGame, saveScore }: UseGameUIProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleHowToPlay = () => {
    setShowHowToPlay(true);
  };

  const handleSaveScore = (selectedMusicId: string | null) => {
    if (!selectedMusicId) return;
    saveScore(selectedMusicId, handleExit);
  };

  const handleExit = () => {
    exitGame();
  };

  return {
    showHowToPlay,
    setShowHowToPlay,
    handleHowToPlay,
    handleSaveScore,
    handleExit,
  };
}
