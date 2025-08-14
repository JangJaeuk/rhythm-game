import { useState } from "react";

interface UseCountdownProps {
  startFrom: number;
  interval?: number;
}

export function useCountdown({
  startFrom,
  interval = 1000,
}: UseCountdownProps) {
  const [count, setCount] = useState<number | null>(null);

  const startCountdown = async () => {
    setCount(startFrom);
    for (let i = startFrom - 1; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      setCount(i);
    }
  };

  return {
    count,
    startCountdown,
  };
}
