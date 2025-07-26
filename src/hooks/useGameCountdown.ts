import { useState } from "react";

export function useGameCountdown() {
  const [countdown, setCountdown] = useState<number | null>(null);

  // 카운트다운과 초기화를 병렬로 처리
  const countdownPromise = async () => {
    setCountdown(3);
    for (let i = 2; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(i);
    }
  };

  return {
    countdown,
    countdownPromise,
  };
}
