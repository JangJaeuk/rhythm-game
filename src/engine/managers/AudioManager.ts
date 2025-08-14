import { measureAudioLatency } from "../utils/audio";

/**
 * 게임의 오디오와 비주얼라이저를 관리하는 매니저
 */
export class AudioManager {
  static analyser?: AnalyserNode;
  static latency: number = 0;

  private static audioContext?: AudioContext;
  private static audioSource?: MediaElementAudioSourceNode;
  private static isAudioInitialized: boolean = false;
  private static connectedAudioElement?: HTMLAudioElement;

  audioStartTime: number = 0; // 오디오 시작 시점의 currentTime
  dataArray?: Uint8Array;

  private audio: HTMLAudioElement | null;
  private previousIntensities: number[] = [];
  private maxIntensity: number = 0;

  private readonly HISTORY_SIZE = 4;
  private readonly DECAY_FACTOR = 0.95; // 최대값 감쇠 계수

  constructor(audio: HTMLAudioElement | null, onGameOver: () => void) {
    this.audio = audio;
    this.audio?.addEventListener("ended", () => {
      onGameOver();
    });

    this.initializeAudio();
  }

  startAudio() {
    this.audioStartTime = this.audio?.currentTime || 0;

    if (AudioManager.audioContext?.state === "suspended") {
      AudioManager.audioContext.resume();
    }
  }

  getCurrentTime() {
    const currentAudioTime =
      (this.audio?.currentTime || 0) - this.audioStartTime;
    return currentAudioTime * 1000;
  }

  processFrequencyData(data: Uint8Array, targetLength: number): number[] {
    const dataLength = data.length;

    // 비트와 멜로디 주파수 대역 분리
    const bassStart = Math.floor(dataLength * 0.05); // ~100Hz
    const bassEnd = Math.floor(dataLength * 0.15); // ~300Hz
    const melodyStart = Math.floor(dataLength * 0.15); // ~300Hz
    const melodyEnd = Math.floor(dataLength * 0.4); // ~2kHz

    // 비트(저주파) 대역의 에너지 계산
    let bassSum = 0;
    for (let i = bassStart; i < bassEnd; i++) {
      bassSum += data[i];
    }
    const bassEnergy = bassSum / (bassEnd - bassStart);

    // 멜로디 대역의 에너지 계산
    let melodySum = 0;
    let maxValue = 0;
    for (let i = melodyStart; i < melodyEnd; i++) {
      melodySum += data[i];
      maxValue = Math.max(maxValue, data[i]);
    }
    const melodyAvg = melodySum / (melodyEnd - melodyStart);

    // 비트와 멜로디 조합
    const currentIntensity = Math.max(
      bassEnergy * 1.2,
      maxValue * 0.7 + melodyAvg * 0.3
    );

    // 최대값 업데이트 (서서히 감소하는 최대값)
    this.maxIntensity = Math.max(
      currentIntensity,
      this.maxIntensity * this.DECAY_FACTOR
    );

    // 이전 값들과 비교하여 변화 감지
    this.previousIntensities.push(currentIntensity);
    if (this.previousIntensities.length > this.HISTORY_SIZE) {
      this.previousIntensities.shift();
    }

    // 변화량 계산 (최근 값들의 변동성)
    let variability = 0;
    for (let i = 1; i < this.previousIntensities.length; i++) {
      const delta = Math.abs(
        this.previousIntensities[i] - this.previousIntensities[i - 1]
      );
      variability += delta;
    }
    variability /= this.previousIntensities.length;

    // 동적 범위 조정을 위한 정규화
    const normalizedIntensity = currentIntensity / (this.maxIntensity || 1);

    // 변화량에 따른 증폭 및 진동 효과
    const oscillation = Math.sin(Date.now() / 50) * 0.1;
    const amplificationFactor = 0.7 + variability / 50 + oscillation;

    // 최종 강도 계산 (더 부드러운 곡선)
    const amplifiedIntensity =
      Math.pow(normalizedIntensity, 0.4) * 255 * amplificationFactor;

    return new Array(targetLength).fill(amplifiedIntensity);
  }

  // 오디오 초기화 함수 추가
  private async initializeAudio() {
    try {
      const bufferLength = AudioManager.analyser?.frequencyBinCount || 0;
      this.dataArray = new Uint8Array(bufferLength);
      this.previousIntensities = [];
      this.maxIntensity = 0;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }

  static async initializeAudioBase(audio: HTMLAudioElement) {
    try {
      // 이미 초기화되어 있고 같은 오디오 엘리먼트인 경우
      if (
        AudioManager.connectedAudioElement === audio &&
        AudioManager.isAudioInitialized
      ) {
        if (!AudioManager.latency) {
          AudioManager.latency = await measureAudioLatency(
            AudioManager.audioContext!
          );
        }
        return;
      }

      // 기존 연결 해제
      if (AudioManager.audioSource) {
        AudioManager.audioSource.disconnect();
      }
      if (AudioManager.analyser) {
        AudioManager.analyser.disconnect();
      }

      // 새로운 AudioContext 생성 및 연결
      if (
        !AudioManager.audioContext ||
        AudioManager.audioContext.state === "closed"
      ) {
        AudioManager.audioContext = new AudioContext();
      }

      try {
        AudioManager.analyser = AudioManager.audioContext.createAnalyser();
        AudioManager.audioSource =
          AudioManager.audioContext.createMediaElementSource(audio);

        AudioManager.audioSource.connect(AudioManager.analyser);
        AudioManager.analyser.connect(AudioManager.audioContext.destination);

        // 더 빠른 반응을 위한 설정 조정
        AudioManager.analyser.fftSize = 1024;
        AudioManager.analyser.smoothingTimeConstant = 0.1;
        AudioManager.analyser.minDecibels = -65;
        AudioManager.analyser.maxDecibels = -12;

        AudioManager.connectedAudioElement = audio;
        AudioManager.isAudioInitialized = true;

        // 레이턴시 측정
        AudioManager.latency = await measureAudioLatency(
          AudioManager.audioContext
        );
        console.log("Measured latency:", AudioManager.latency, "ms");
      } catch (error) {
        // 이미 연결된 경우 기존 연결 재사용
        if (
          error instanceof DOMException &&
          error.name === "InvalidStateError"
        ) {
          if (!AudioManager.latency) {
            AudioManager.latency = await measureAudioLatency(
              AudioManager.audioContext
            );
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Failed to initialize audio base:", error);
    }
  }
}
