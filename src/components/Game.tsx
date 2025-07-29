import { useEffect, useRef, useState } from "react";
import { MUSIC_LIST } from "../constants/music";
import { AudioManager } from "../engine/managers/AudioManager";
import { useBrowserCheck } from "../hooks/useBrowserCheck";
import { useGame } from "../hooks/useGame";
import { useGameAudio } from "../hooks/useGameAudio";
import { useGameCanvasSize } from "../hooks/useGameCanvasSize";
import { useGameCountdown } from "../hooks/useGameCountdown";
import { useGameScore } from "../hooks/useGameScore";
import s from "./game.module.scss";
import { BrowserCheckModal } from "./modals/BrowserCheckModal";
import { GameOverModal } from "./modals/GameOverModal";
import { HowToPlayModal } from "./modals/HowToPlayModal";
import { PauseModal } from "./modals/PauseModal";
import { MusicList } from "./musicList/MusicList";

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);

  const { containerRef, canvasSize } = useGameCanvasSize();
  const { playerName, setPlayerName, saveScore } = useGameScore();
  const { countdown, countdownPromise } = useGameCountdown();
  const { waitForAudioStart, playAudio, pauseAudio, resetAudio, loadAudio } =
    useGameAudio(audioRef);

  const isSupportedBrowser = useBrowserCheck();

  const {
    startGame,
    pauseGame,
    resumeGame,
    exitGame,
    startCountdown,
    gameState,
    isPaused,
    maxCombo,
    score,
    perfectCount,
    goodCount,
    normalCount,
    missCount,
    gameEngine,
  } = useGame(canvasRef, audioRef);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && gameState === "playing") {
        pauseAudio();
        pauseGame();
      } else if (e.key === "Escape" && gameState === "paused") {
        setShowHowToPlay(false);
        await playAudio();
        resumeGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, pauseGame, resumeGame, pauseAudio, playAudio]);

  // 마우스 클릭 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gameState || !gameEngine) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 일시정지 버튼 클릭 체크
    if (gameState === "playing" && gameEngine.isPauseButtonClicked(x, y)) {
      pauseAudio();
      pauseGame();
    }
  };

  const handleMusicSelect = async (musicId: string) => {
    const selectedMusic = MUSIC_LIST.find((music) => music.id === musicId);
    if (!selectedMusic || !audioRef.current) return;

    setSelectedMusicId(musicId);
    setCanvasKey((prev) => prev + 1);

    // 오디오 로드
    loadAudio();

    startCountdown();

    const initPromise = AudioManager.initializeAudioBase(audioRef.current);

    // 둘 다 완료될 때까지 대기
    await Promise.all([countdownPromise(), initPromise]);

    // 이제 오디오 재생하고 게임 시작
    await playAudio();
    await waitForAudioStart();
    startGame(musicId);
  };

  const handleHowToPlay = () => {
    setShowHowToPlay(true);
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
    <div ref={containerRef} className={s.gameContainer}>
      <canvas
        key={canvasKey}
        ref={canvasRef}
        className={s.gameCanvas}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
        onClick={handleCanvasClick}
      />

      {gameState === "idle" && <MusicList onSelectMusic={handleMusicSelect} />}

      {countdown && gameState === "countdown" && (
        <div className={s.countdown}>{countdown}</div>
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
        onHowToPlay={handleHowToPlay}
      />

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      <audio ref={audioRef} preload="auto">
        <source
          src={
            selectedMusicId
              ? MUSIC_LIST.find((m) => m.id === selectedMusicId)?.audioFile
              : ""
          }
          type="audio/mpeg"
        />
      </audio>
    </div>
  );
}
export default Game;
