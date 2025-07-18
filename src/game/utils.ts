
import { NOTE_DELAY } from "./constants/gameBase";
import { JINGLE_BELL_NOTES } from "./constants/notes/jingleBell";
import { Note, NoteType } from "./types";

export function createNote(
  lane: number,
  timing: number,
  duration?: number
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
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}


// 노트 반환
export function getNotes(musicId: string): Note[] {
  switch (musicId) {
    case "jingle-bells":
      return JINGLE_BELL_NOTES;
    
    // 다른 음악이 추가되면 여기에 case 추가
    default:
      return [];
  }
}
