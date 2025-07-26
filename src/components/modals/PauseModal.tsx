import s from "./pauseModal.module.scss";

interface PauseModalProps {
  isActive: boolean;
  onResume: () => Promise<void>;
  onExit: () => void;
  onHowToPlay: () => void;
}

export function PauseModal({
  isActive,
  onResume,
  onExit,
  onHowToPlay,
}: PauseModalProps) {
  return (
    <div className={`${s.pauseMenu} ${isActive ? s.active : ""}`}>
      <button className={s.button} onClick={onHowToPlay}>
        How To Play
      </button>
      <button className={s.button} onClick={onResume}>
        Resume
      </button>
      <button className={s.button} onClick={onExit}>
        Exit Game
      </button>
    </div>
  );
}
