interface PauseModalProps {
  isActive: boolean;
  onResume: () => Promise<void>;
  onExit: () => void;
}

export function PauseModal({ isActive, onResume, onExit }: PauseModalProps) {
  return (
    <div className={`pause-menu ${isActive ? "active" : ""}`}>
      <button className="button" onClick={onResume}>
        Resume
      </button>
      <button className="button" onClick={onExit}>
        Exit Game
      </button>
    </div>
  );
} 