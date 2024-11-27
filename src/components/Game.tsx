import { useEffect, useRef } from "react";
import { useGame } from "../hooks/useGame.ts";
import "./game.css";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../game/constants.ts";

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { startGame, pauseGame, resumeGame, exitGame, gameState, isPaused } =
    useGame(canvasRef);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gameState === "playing") {
        pauseGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, pauseGame]);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />

      <div className="controls">
        {gameState === "idle" && (
          <button className="button" onClick={startGame}>
            Start Game
          </button>
        )}
      </div>

      <div className={`pause-menu ${isPaused ? "active" : ""}`}>
        <button className="button" onClick={resumeGame}>
          Resume
        </button>
        <button className="button" onClick={exitGame}>
          Exit Game
        </button>
      </div>
    </div>
  );
}

export default Game;
