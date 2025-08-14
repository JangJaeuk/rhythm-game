import { useRef } from "react";
import { MUSIC_LIST } from "../../constants/music";
import { useBrowserCheck } from "../../hooks/browser/useBrowserCheck";
import { useGame } from "../../hooks/game/useGame";
import { useGameCanvasSize } from "../../hooks/game/useGameCanvasSize";
import { useGameCountdown } from "../../hooks/game/useGameCountdown";
import { useGameEvents } from "../../hooks/game/useGameEvents";
import { useGameMusicSetup } from "../../hooks/game/useGameMusicSetup";
import { useGameUI } from "../../hooks/game/useGameUI";
import { BrowserCheckModal } from "../modals/BrowserCheckModal";
import { GameOverModal } from "../modals/GameOverModal";
import { HowToPlayModal } from "../modals/HowToPlayModal";
import { PauseModal } from "../modals/PauseModal";
import { MusicList } from "../musicList/MusicList";
import s from "./game.module.scss";

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { containerRef, canvasSize } = useGameCanvasSize();
  const { countdown, countdownPromise } = useGameCountdown();
  const isSupportedBrowser = useBrowserCheck();

  const {
    state,
    isPlaying,
    isPaused,
    startGame,
    pauseGame,
    resumeGame,
    exitGame,
    startCountdown,
    score,
    maxCombo,
    perfectCount,
    goodCount,
    normalCount,
    missCount,
    playerName,
    setPlayerName,
    saveScore,
    gameEngine,
  } = useGame({
    canvasRef,
    audioRef,
  });

  const { selectedMusicId, canvasKey, handleMusicSelect, resetAudio } =
    useGameMusicSetup({
      audioRef,
      countdownPromise,
      startCountdown,
      startGame,
    });

  const {
    showHowToPlay,
    setShowHowToPlay,
    handleHowToPlay,
    handleSaveScore,
    handleExit,
  } = useGameUI({
    exitGame: () => {
      exitGame();
      resetAudio();
    },
    saveScore,
  });

  const { handleCanvasClick } = useGameEvents({
    canvasRef,
    gameEngine,
    isPlaying,
    isPaused,
    pauseGame,
    resumeGame,
    setShowHowToPlay,
  });

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
          onSaveScore={() => handleSaveScore(selectedMusicId)}
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
