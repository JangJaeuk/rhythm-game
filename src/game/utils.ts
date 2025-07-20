import { NOTE_DELAY } from "./constants/gameBase";
import { A_SMALL_MIRACLE_NOTES } from "./constants/notes/aSmallMiracle";
import { JINGLE_BELL_NOTES } from "./constants/notes/jingleBell";
import { Note, NoteType } from "./types";

export function createNote(
  lane: number,
  timing: number,
  duration?: number,
): Note {
  return {
    lane,
    timing: timing + NOTE_DELAY,
    type: duration ? NoteType.LONG : NoteType.SHORT,
    duration,
    isHeld: false,
  };
}

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

// 노트 반환
export function getNotes(musicId: string): Note[] {
  switch (musicId) {
    case "jingle-bells":
      return JINGLE_BELL_NOTES;
    case "a-small-miracle":
      return A_SMALL_MIRACLE_NOTES;
    // 다른 음악이 추가되면 여기에 case 추가
    default:
      return [];
  }
}

export async function measureAudioLatency(
  audioContext: AudioContext,
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

export async function waitForAudioRefRaf(
  audioRef: React.RefObject<HTMLAudioElement>,
): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50; // 약 1초 (50 프레임) 동안 시도

    const check = () => {
      attempts++;
      if (audioRef.current) {
        console.log("Audio element found after", attempts, "attempts");
        resolve(audioRef.current);
      } else {
        if (attempts >= maxAttempts) {
          console.warn("Failed to find audio element after", attempts, "attempts");
          resolve(null);
        } else {
          requestAnimationFrame(check);
        }
      }
    };
    check();
  });
}
