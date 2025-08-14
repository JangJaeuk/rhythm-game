import { Score } from "../../types/score";

export function useScoreStorage() {
  const saveToStorage = (scores: Score[]) => {
    try {
      localStorage.setItem("scores", JSON.stringify(scores));
      return true;
    } catch (error) {
      console.error("Failed to save scores:", error);
      return false;
    }
  };

  const loadFromStorage = (): Score[] => {
    try {
      return JSON.parse(localStorage.getItem("scores") || "[]");
    } catch (error) {
      console.error("Failed to load scores:", error);
      return [];
    }
  };

  const addScore = (newScore: Score): boolean => {
    const scores = loadFromStorage();
    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score);
    return saveToStorage(scores);
  };

  return {
    saveToStorage,
    loadFromStorage,
    addScore,
  };
}
