// 오디오 레이턴시 측정
export async function measureAudioLatency(
  audioContext: AudioContext
): Promise<number> {
  // AudioContext가 suspended 상태면 먼저 resume
  if (audioContext.state === "suspended") {
    try {
      console.log("Attempting to resume AudioContext...");
      await audioContext.resume();
      console.log("AudioContext resumed, new state:", audioContext.state);
    } catch (error) {
      console.warn("Failed to resume AudioContext:", error);
    }
  }

  return new Promise((resolve) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.001;

    oscillator.frequency.value = 440;
    oscillator.connect(gainNode).connect(audioContext.destination);

    // JS 시간과 오디오 시간의 차이 보정
    const audioTimeInMs = audioContext.currentTime * 1000;
    const jsNow = performance.now();
    const timeOffset = jsNow - audioTimeInMs; // 두 시계 간의 차이

    const startTime = audioContext.currentTime + 0.1; // 100ms 이후 실행 예약
    const toneDuration = 0.1;

    try {
      oscillator.start(startTime);
      oscillator.stop(startTime + toneDuration);
    } catch (error) {
      console.error("Failed to schedule oscillator:", error);
      resolve(0);
      return;
    }

    // 타임아웃 설정 (1초)
    const timeoutId = setTimeout(() => {
      resolve(0); // 타임아웃 시 기본값 사용
    }, 1000);

    oscillator.onended = () => {
      clearTimeout(timeoutId);
      const jsEndTime = performance.now();
      const expectedEndTime = (startTime + toneDuration) * 1000 + timeOffset;
      const latency = jsEndTime - expectedEndTime;

      resolve(Math.max(0, latency));
    };
  });
}
