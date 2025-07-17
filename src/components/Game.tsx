import { useEffect, useRef, useState } from "react";
import { useGame } from "../hooks/useGame.ts";
import "./game.css";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FIRST_AUDIO_DELAY,
} from "../game/constants.ts";

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [playerName, setPlayerName] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const isFirstAudioPlay = useRef(false);

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

  useEffect(() => {
    const audio = audioRef.current;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && gameState === "playing") {
        audio?.pause();
        pauseGame();
      } else if (e.key === "Escape" && gameState === "paused") {
        await audio?.play();
        resumeGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState, pauseGame, resumeGame]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, []);

  const saveScore = () => {
    if (playerName.trim() === "") return;

    const newScore = { name: playerName, score };
    const storedScores = JSON.parse(localStorage.getItem("scores") || "[]");
    storedScores.push(newScore);
    storedScores.sort((a, b) => b.score - a.score);
    localStorage.setItem("scores", JSON.stringify(storedScores));
    setPlayerName("");
    exitGame();
  };

  const renderLeaderboard = () => {
    const scores = JSON.parse(localStorage.getItem("scores") || "[]");
    return (
      <div className="leaderboard-container">
        <h2>Rankings</h2>
        <ul>
          {scores.map((entry, index) => (
            <li key={index}>
              {index + 1}. {entry.name}: {entry.score}
            </li>
          ))}
        </ul>
        <button className="button" onClick={() => setShowLeaderboard(false)}>
          Back to Menu
        </button>
      </div>
    );
  };

  const waitFirstAudioPlay = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
        isFirstAudioPlay.current = true;
      }, FIRST_AUDIO_DELAY);
    });
  };

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />

      {gameState === "idle" && (
        <>
          <div className="overlay-background" />
          <div className="start-container">
            {showLeaderboard ? (
              renderLeaderboard()
            ) : (
              <>
                <div className="start-title">Rhythm Game</div>
                <div className="start-subtitle">Press Start to Play</div>
                <button
                  className="button"
                  onClick={async () => {
                    if (audioRef.current) {
                      audioRef.current.load();
                      await audioRef.current?.play();
                      if (!isFirstAudioPlay.current) {
                        await waitFirstAudioPlay();
                      }
                      startGame();
                    }
                  }}
                >
                  Start Game
                </button>
                <button
                  className="button"
                  onClick={() => setShowLeaderboard(true)}
                >
                  View Rankings
                </button>
              </>
            )}
          </div>
        </>
      )}

      {gameState === "ended" && (
        <>
          <div className="overlay-background" />
          <div className="game-over-container">
            <div className="game-over-text">Game Over</div>
            <div className="game-over-description">Score: {score}</div>
            <div className="game-over-description">Max Combo: {maxCombo}</div>
            <div className="game-over-description">Perfect: {perfectCount}</div>
            <div className="game-over-description">Good: {goodCount}</div>
            <div className="game-over-description">Normal: {normalCount}</div>
            <div className="game-over-description">Miss: {missCount}</div>
            <input
              type="text"
              className="input-field"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
            <button className="button" onClick={saveScore}>
              Save Score
            </button>
            <button className="button" onClick={() => exitGame()}>
              Return to Menu
            </button>
          </div>
        </>
      )}

      <div className={`pause-menu ${isPaused ? "active" : ""}`}>
        <button
          className="button"
          onClick={async () => {
            if (audioRef.current) {
              await audioRef.current?.play();
              resumeGame();
            }
          }}
        >
          Resume
        </button>
        <button
          className="button"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            exitGame();
          }}
        >
          Exit Game
        </button>
      </div>
      <audio ref={audioRef}>
        <source src={"./src/assets/jingle-bells.mp3"} type={"audio/mpeg"} />
      </audio>
    </div>
  );
}

export default Game;
