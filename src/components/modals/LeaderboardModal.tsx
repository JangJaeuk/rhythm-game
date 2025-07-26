import s from "./leaderboardModal.module.scss";

interface Score {
  name: string;
  score: number;
}

interface LeaderboardModalProps {
  scores: Score[];
  onClose: () => void;
}

export function LeaderboardModal({ scores, onClose }: LeaderboardModalProps) {
  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={s.title}>랭킹</h2>
        <div className={s.content}>
          <ul className={s.rankingList}>
            {scores.map((entry: Score, index: number) => (
              <li key={index} className={s.rankingItem}>
                <span className={s.rank}>{index + 1}</span>
                <span className={s.name}>{entry.name}</span>
                <span className={s.score}>{entry.score}</span>
              </li>
            ))}
          </ul>
        </div>
        <button className={s.closeButton} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
