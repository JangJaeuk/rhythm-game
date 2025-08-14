import { useState } from "react";
import { Score } from "../../types/score";
import { useScoreStorage } from "../storage/useScoreStorage";

interface GameScoreState {
  score: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  normalCount: number;
  missCount: number;
}

interface UseGameScoreReturn extends GameScoreState {
  getLeaderboard: () => Score[];
  playerName: string;
  setPlayerName: (name: string) => void;
  updateScore: (newScore: number) => void;
  updateCombo: (combo: number) => void;
  updateCounts: (
    type: "perfect" | "good" | "normal" | "miss",
    count: number
  ) => void;
  saveScore: (musicId: string, onSave?: () => void) => void;
  resetScore: () => void;
}

export function useGameScore(): UseGameScoreReturn {
  const [playerName, setPlayerName] = useState("");
  const [scoreState, setScoreState] = useState<GameScoreState>({
    score: 0,
    maxCombo: 0,
    perfectCount: 0,
    goodCount: 0,
    normalCount: 0,
    missCount: 0,
  });

  const { addScore, loadFromStorage } = useScoreStorage();

  const updateScore = (newScore: number) => {
    setScoreState((prev) => ({ ...prev, score: newScore }));
  };

  const updateCombo = (combo: number) => {
    setScoreState((prev) => ({
      ...prev,
      maxCombo: Math.max(prev.maxCombo, combo),
    }));
  };

  const updateCounts = (
    type: "perfect" | "good" | "normal" | "miss",
    count: number = 1
  ) => {
    setScoreState((prev) => ({
      ...prev,
      [`${type}Count`]: count,
    }));
  };

  const saveScore = (musicId: string, onSave?: () => void) => {
    if (playerName.trim() === "") return;

    const success = addScore({
      name: playerName,
      score: scoreState.score,
      musicId,
    });

    if (success && onSave) {
      setPlayerName("");
      onSave();
    }
  };

  const resetScore = () => {
    setScoreState({
      score: 0,
      maxCombo: 0,
      perfectCount: 0,
      goodCount: 0,
      normalCount: 0,
      missCount: 0,
    });
  };

  return {
    ...scoreState,
    playerName,
    setPlayerName,
    updateScore,
    updateCombo,
    updateCounts,
    saveScore,
    resetScore,
    getLeaderboard: loadFromStorage,
  };
}
