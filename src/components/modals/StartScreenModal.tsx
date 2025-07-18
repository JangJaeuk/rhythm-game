import { LeaderboardModal } from "./LeaderboardModal";

interface Score {
  name: string;
  score: number;
}

interface StartScreenModalProps {
  showLeaderboard: boolean;
  scores: Score[];
  onStartGame: () => void;
  onShowLeaderboard: () => void;
  onHideLeaderboard: () => void;
}

export function StartScreenModal({
  showLeaderboard,
  scores,
  onStartGame,
  onShowLeaderboard,
  onHideLeaderboard,
}: StartScreenModalProps) {
  return (
    <>
      <div className="overlay-background" />
      <div className="start-container">
        {showLeaderboard ? (
          <LeaderboardModal
            scores={scores}
            onClose={onHideLeaderboard}
          />
        ) : (
          <>
            <div className="start-title">Rhythm Game</div>
            <div className="start-subtitle">Press Start to Play</div>
            <button className="button" onClick={onStartGame}>
              Start Game
            </button>
            <button
              className="button"
              onClick={onShowLeaderboard}
            >
              View Rankings
            </button>
          </>
        )}
      </div>
    </>
  );
} 