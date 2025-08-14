import { useCountdown } from "../core/useCountdown";

export function useGameCountdown() {
  const { count, startCountdown } = useCountdown({
    startFrom: 3,
  });

  return {
    countdown: count,
    countdownPromise: startCountdown,
  };
}
