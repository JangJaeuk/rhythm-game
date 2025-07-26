// 난이도 포매팅
export function getFormattedDifficulty(difficulty: number) {
  return "★".repeat(difficulty);
}

// 시간 포매팅
export function getFormattedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
