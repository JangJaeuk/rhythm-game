import { useState } from 'react';

interface Score {
  name: string;
  score: number;
}

export function useGameScore() {
  const [playerName, setPlayerName] = useState("");

  const saveScore = (score: number, onSave: () => void) => {
    if (playerName.trim() === "") return;

    const newScore: Score = { name: playerName, score };
    const storedScores: Score[] = JSON.parse(localStorage.getItem("scores") || "[]");
    storedScores.push(newScore);
    storedScores.sort((a: Score, b: Score) => b.score - a.score);
    localStorage.setItem("scores", JSON.stringify(storedScores));
    setPlayerName("");
    onSave();
  };

  const getLeaderboard = (): Score[] => {
    return JSON.parse(localStorage.getItem("scores") || "[]");
  };

  return {
    playerName,
    setPlayerName,
    saveScore,
    getLeaderboard
  };
} 