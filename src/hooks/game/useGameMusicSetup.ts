import { RefObject, useState } from "react";
import { MUSIC_LIST } from "../../constants/music";
import { AudioManager } from "../../engine/managers/AudioManager";

interface UseGameAudioSetupProps {
  audioRef: RefObject<HTMLAudioElement>;
  countdownPromise: () => Promise<void>;
  startCountdown: () => void;
  startGame: (musicId: string) => Promise<void>;
}

export function useGameMusicSetup({
  audioRef,
  countdownPromise,
  startCountdown,
  startGame,
}: UseGameAudioSetupProps) {
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleMusicSelect = async (musicId: string) => {
    const selectedMusic = MUSIC_LIST.find((music) => music.id === musicId);
    if (!selectedMusic || !audioRef.current) return;

    setSelectedMusicId(musicId);
    setCanvasKey((prev) => prev + 1);

    // 오디오 로드
    audioRef.current.load();

    startCountdown();

    const initPromise = AudioManager.initializeAudioBase(audioRef.current);

    // 둘 다 완료될 때까지 대기
    await Promise.all([countdownPromise(), initPromise]);

    // 이제 게임 시작
    await startGame(musicId);
  };

  const resetAudio = () => {
    setSelectedMusicId(null);
  };

  return {
    selectedMusicId,
    canvasKey,
    handleMusicSelect,
    resetAudio,
  };
}
