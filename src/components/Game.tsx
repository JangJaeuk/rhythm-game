import { useEffect, useRef, useState } from "react";
import { MUSIC_LIST } from "../constants/music";
import { AudioManager } from "../engine/managers/AudioManager";
import { useBrowserCheck } from "../hooks/browser/useBrowserCheck";
import { useGame } from "../hooks/game/useGame";
import { useGameCanvasSize } from "../hooks/game/useGameCanvasSize";
import { useGameCountdown } from "../hooks/game/useGameCountdown";
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
  const { countdown, countdownPromise } = useGameCountdown();
  const isSupportedBrowser = useBrowserCheck();

  const {
    // 게임 상태 관련
    state,
    isPlaying,
    isPaused,
    startGame,
    pauseGame,
    resumeGame,
    exitGame,
    startCountdown,

    // 점수 관련
    score,
    maxCombo,
    perfectCount,
    goodCount,
    normalCount,
    missCount,
    playerName,
    setPlayerName,
    saveScore,

    // 게임 엔진
    gameEngine,
  } = useGame({
    canvasRef,
    audioRef,
  });

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
  }, [isPlaying, isPaused, pauseGame, resumeGame]);

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

  const handleHowToPlay = () => {
    setShowHowToPlay(true);
  };

  const handleSaveScore = () => {
    if (!selectedMusicId) return;
    saveScore(selectedMusicId, handleExit);
  };

  const handleExit = () => {
    exitGame();
    setSelectedMusicId(null);
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

      {state === "idle" && <MusicList onSelectMusic={handleMusicSelect} />}

      {state === "countdown" && <div className={s.countdown}>{countdown}</div>}

      {state === "ended" && (
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
        onResume={resumeGame}
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
