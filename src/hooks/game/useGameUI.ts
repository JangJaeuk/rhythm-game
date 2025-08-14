import { useModal } from "../core/useModal";

interface UseGameUIProps {
  exitGame: () => void;
  saveScore: (musicId: string, onSave?: () => void) => void;
}

export function useGameUI({ exitGame, saveScore }: UseGameUIProps) {
  const howToPlayModal = useModal(false);

  const handleSaveScore = (selectedMusicId: string | null) => {
    if (!selectedMusicId) return;
    saveScore(selectedMusicId, handleExit);
  };

  const handleExit = () => {
    exitGame();
  };

  return {
    showHowToPlay: howToPlayModal.isOpen,
    setShowHowToPlay: howToPlayModal.setIsOpen,
    handleHowToPlay: howToPlayModal.open,
    handleSaveScore,
    handleExit,
  };
}
