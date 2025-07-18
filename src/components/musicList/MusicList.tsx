import { useState } from "react";
import { MUSIC_LIST } from "../../game/constants/music";
import { getFormattedDifficulty, getFormattedTime } from "../../game/utils";
import { useGameScore } from "../../hooks/useGameScore";
import { LeaderboardModal } from "../modals/LeaderboardModal";
import s from "./musicList.module.scss";

interface MusicListProps {
  onSelectMusic: (musicId: string) => void;
}

export function MusicList({ onSelectMusic }: MusicListProps) {
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { getLeaderboard } = useGameScore();

  return (
    <div className={s.container}>
      <h1 className={s.title}>음악 선택</h1>
      <div className={s.musicList}>
        {MUSIC_LIST.map((music) => (
          <div key={music.id} className={s.musicItem}>
            <div className={s.musicInfo}>
              <h2 className={s.musicTitle}>{music.title}</h2>
              <div className={s.musicDetails}>
                <span className={s.difficulty}>난이도: {getFormattedDifficulty(music.difficulty)}</span>
                <span className={s.duration}>길이: {getFormattedTime(music.duration)}</span>
              </div> 
            </div>
            <div className={s.buttonGroup}>
              <button
                className={s.playButton}
                onClick={() => onSelectMusic(music.id)}
              >
                실행
              </button>
              <button
                className={s.rankingButton}
                onClick={() => {
                  setSelectedMusicId(music.id);
                  setShowLeaderboard(true);
                }}
              >
                랭킹보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {showLeaderboard && (
        <LeaderboardModal
          scores={getLeaderboard().filter(score => score.musicId === selectedMusicId)}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
} 