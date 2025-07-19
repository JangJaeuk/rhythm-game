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
  return await new Promise<number>((resolve) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    gainNode.gain.value = 0.001; // 거의 무음

    oscillator.frequency.value = 440;
    oscillator.connect(gainNode).connect(audioContext.destination);

    const startTime = audioContext.currentTime;
    const performanceStart = performance.now();

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);

    oscillator.onended = () => {
      const endPerformance = performance.now();
      const measuredLatency = endPerformance - performanceStart - 100;
      const clamped = Math.max(0, measuredLatency);

      resolve(clamped);
    };
  });
}

export async function waitForAudioRefRaf(
  audioRef: React.RefObject<HTMLAudioElement>,
): Promise<HTMLAudioElement> {
  return new Promise((resolve) => {
    const check = () => {
      if (audioRef.current) {
        resolve(audioRef.current);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}
