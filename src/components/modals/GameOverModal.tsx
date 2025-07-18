interface GameOverModalProps {
  score: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  normalCount: number;
  missCount: number;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onSaveScore: () => void;
  onExit: () => void;
}

export function GameOverModal({
  score,
  maxCombo,
  perfectCount,
  goodCount,
  normalCount,
  missCount,
  playerName,
  onPlayerNameChange,
  onSaveScore,
  onExit
}: GameOverModalProps) {
  return (
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
          onChange={(e) => onPlayerNameChange(e.target.value)}
          placeholder="Enter your name"
        />
        <button className="button" onClick={onSaveScore}>
          Save Score
        </button>
        <button className="button" onClick={onExit}>
          Return to Menu
        </button>
      </div>
    </>
  );
} 