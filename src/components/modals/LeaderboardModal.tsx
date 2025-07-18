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
    <div className="leaderboard-container">
      <h2>Rankings</h2>
      <ul>
        {scores.map((entry: Score, index: number) => (
          <li key={index}>
            {index + 1}. {entry.name}: {entry.score}
          </li>
        ))}
      </ul>
      <button className="button" onClick={onClose}>
        Back to Menu
      </button>
    </div>
  );
} 