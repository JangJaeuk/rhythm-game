import { useEffect, useRef, useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../game/constants";
import { useBrowserCheck } from "../hooks/useBrowserCheck";
import { useGame } from "../hooks/useGame";
import { useGameAudio } from "../hooks/useGameAudio";
import { useGameScore } from "../hooks/useGameScore";
import s from "./game.module.scss";
import { BrowserCheckModal } from "./modals/BrowserCheckModal";
import { GameOverModal } from "./modals/GameOverModal";
import { PauseModal } from "./modals/PauseModal";
import { StartScreenModal } from "./modals/StartScreenModal";

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const isSupportedBrowser = useBrowserCheck();
  const { playerName, setPlayerName, saveScore, getLeaderboard } = useGameScore();
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

  const handleGameStart = async () => {
    loadAudio();
    await playAudio();
    await waitForAudioStart();
    startGame();
  };

  const handleResume = async () => {
    await playAudio();
    resumeGame();
  };

  const handleExit = () => {
    resetAudio();
    exitGame();
  };

  if (!isSupportedBrowser) {
    return <BrowserCheckModal />;
  }

  return (
    <div className={s.gameContainer}>
      <canvas
        ref={canvasRef}
        className={s.gameCanvas}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />

      {gameState === "idle" && (
        <StartScreenModal
          showLeaderboard={showLeaderboard}
          scores={getLeaderboard()}
          onStartGame={handleGameStart}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onHideLeaderboard={() => setShowLeaderboard(false)}
        />
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
          onSaveScore={() => saveScore(score, exitGame)}
          onExit={exitGame}
        />
      )}

      <PauseModal
        isActive={isPaused}
        onResume={handleResume}
        onExit={handleExit}
      />

      <audio ref={audioRef} preload="auto">
        <source src={"./src/assets/jingle-bells.mp3"} type={"audio/mpeg"} />
      </audio>
    </div>
  );
}

export default Game;
