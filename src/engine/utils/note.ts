import { NOTE_DELAY } from "../constants/gameBase";
import { A_SMALL_MIRACLE_NOTES } from "../constants/notes/aSmallMiracle";
import { JINGLE_BELL_NOTES } from "../constants/notes/jingleBell";
import { Note, NoteType } from "../types/note";

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
