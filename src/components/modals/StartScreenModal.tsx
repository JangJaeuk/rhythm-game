import { LeaderboardModal } from './LeaderboardModal';
import s from './startScreenModal.module.scss';

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
      <div className={s.overlayBackground} />
      <div className={s.container}>
        {showLeaderboard ? (
          <LeaderboardModal
            scores={scores}
            onClose={onHideLeaderboard}
          />
        ) : (
          <>
            <div className={s.title}>Rhythm Game</div>
            <div className={s.subtitle}>Press Start to Play</div>
            <button className={s.button} onClick={onStartGame}>
              Start Game
            </button>
            <button
              className={s.button}
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