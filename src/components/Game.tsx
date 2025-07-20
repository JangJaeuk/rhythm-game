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
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

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
    handleCanvasClick,
    handleCanvasRelease,
  } = useGame(canvasRef, audioRef);
  const { waitForAudioStart, playAudio, pauseAudio, resetAudio, loadAudio } = useGameAudio(audioRef);

  // 캔버스 크기 조정
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const MAX_HEIGHT = CANVAS_HEIGHT;
      const ORIGINAL_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;
      
      const containerWidth = containerRef.current.clientWidth;
      const availableHeight = Math.min(containerRef.current.clientHeight, MAX_HEIGHT);
      
      // 너비 기준으로 계산했을 때의 크기
      const widthBasedSize = {
        width: containerWidth,
        height: containerWidth / ORIGINAL_ASPECT_RATIO
      };
      
      // 높이 기준으로 계산했을 때의 크기
      const heightBasedSize = {
        width: availableHeight * ORIGINAL_ASPECT_RATIO,
        height: availableHeight
      };
      
      // 둘 중 더 작은 크기를 선택 (컨테이너를 벗어나지 않는 크기)
      const finalSize = widthBasedSize.height <= availableHeight
        ? widthBasedSize
        : heightBasedSize;
      
      setCanvasSize(finalSize);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // 캔버스 클릭/터치 이벤트 핸들러
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    handleCanvasClick(x);
  };

  // 캔버스 마우스업/터치엔드 이벤트 핸들러
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    handleCanvasRelease(x);
  };

  // 터치 시작 핸들러
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    e.preventDefault(); // 기본 동작 방지 (스크롤 등)
    
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    handleCanvasClick(x);
  };

  // 터치 종료 핸들러
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    e.preventDefault(); // 기본 동작 방지
    
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const x = touch.clientX - rect.left;
    handleCanvasRelease(x);
  };

  const handleMusicSelect = async (musicId: string) => {
    const selectedMusic = MUSIC_LIST.find(music => music.id === musicId);
    if (!selectedMusic) return;

    setSelectedMusicId(musicId);
    setCanvasKey(prev => prev + 1);
    
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
    <div ref={containerRef} className={s.gameContainer}>
      <canvas
        key={canvasKey}
        ref={canvasRef}
        className={s.gameCanvas}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: canvasSize.width,
          height: canvasSize.height
        }}
        onMouseDown={handleClick}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

