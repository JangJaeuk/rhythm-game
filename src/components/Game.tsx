import { useEffect, useRef, useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../game/constants/gameBase";
import { MUSIC_LIST } from "../game/constants/music";
import { useBrowserCheck } from "../hooks/useBrowserCheck";
import { useGame } from "../hooks/useGame";
import { useGameAudio } from "../hooks/useGameAudio";
import { useGameScore } from "../hooks/useGameScore";
import s from "./game.module.scss";
import { BrowserCheckModal } from "./modals/BrowserCheckModal";
import { GameOverModal } from "./modals/GameOverModal";
import { PauseModal } from "./modals/PauseModal";
import { MusicList } from "./musicList/MusicList";

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);

  const isSupportedBrowser = useBrowserCheck();
  const { playerName, setPlayerName, saveScore } = useGameScore();
  const {
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
  } = useGame(canvasRef, audioRef);
  const { waitForAudioStart, playAudio, pauseAudio, resetAudio, loadAudio } = useGameAudio(audioRef);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && gameState === "playing") {
        pauseAudio();
        pauseGame();
      } else if (e.key === "Escape" && gameState === "paused") {
        await playAudio();
        resumeGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, pauseGame, resumeGame, pauseAudio, playAudio]);

  const handleMusicSelect = async (musicId: string) => {
    const selectedMusic = MUSIC_LIST.find(music => music.id === musicId);
    if (!selectedMusic) return;

    setSelectedMusicId(musicId);
    setCanvasKey(prev => prev + 1); // 새로운 key 값 설정
    
    loadAudio();
    await playAudio();
    await waitForAudioStart();
    startGame(musicId);
  };

  const handleResume = async () => {
    await playAudio();
    resumeGame();
  };

  const handleExit = () => {
    resetAudio();
    exitGame();
    setSelectedMusicId(null);
  };

  const handleSaveScore = () => {
    if (!selectedMusicId) return;
    saveScore(score, selectedMusicId, handleExit);
  };

  if (!isSupportedBrowser) {
    return <BrowserCheckModal />;
  }

  return (
    <div className={s.gameContainer}>
      <canvas
        key={canvasKey}
        ref={canvasRef}
        className={s.gameCanvas}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />

      {gameState === "idle" && (
        <MusicList onSelectMusic={handleMusicSelect} />
      )}

      {gameState === "ended" && (
        <GameOverModal
          score={score}
          maxCombo={maxCombo}
          perfectCount={perfectCount}
          goodCount={goodCount}
          normalCount={normalCount}
          missCount={missCount}
          playerName={playerName}
          onPlayerNameChange={setPlayerName}
          onSaveScore={handleSaveScore}
          onExit={handleExit}
        />
      )}

      <PauseModal
        isActive={isPaused}
        onResume={handleResume}
        onExit={handleExit}
      />

      <audio ref={audioRef} preload="auto">
        <source src={selectedMusicId ? MUSIC_LIST.find(m => m.id === selectedMusicId)?.audioFile : ""} type="audio/mpeg" />
      </audio>
    </div>
  );
}
export default Game;

