import s from './gameOverModal.module.scss';

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
      <div className={s.overlayBackground} />
      <div className={s.container}>
        <div className={s.text}>Game Over</div>
        <div className={s.description}>Score: {score}</div>
        <div className={s.description}>Max Combo: {maxCombo}</div>
        <div className={s.description}>Perfect: {perfectCount}</div>
        <div className={s.description}>Good: {goodCount}</div>
        <div className={s.description}>Normal: {normalCount}</div>
        <div className={s.description}>Miss: {missCount}</div>
        <input
          type="text"
          className={s.inputField}
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
          placeholder="Enter your name"
        />
        <button className={s.button} onClick={onSaveScore}>
          Save Score
        </button>
        <button className={s.button} onClick={onExit}>
          Return to Menu
        </button>
      </div>
    </>
  );
} 