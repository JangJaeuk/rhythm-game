import { NOTE_DELAY } from "./constants";
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

// 노트 생성
export function createNotes(): Note[] {
  return [
    createNote(0, 700),
    createNote(1, 1650),
    createNote(2, 2600),
    createNote(3, 3550),

    createNote(0, 4300),
    createNote(2, 4530),
    createNote(1, 4760),
    createNote(3, 4990),

    createNote(0, 5230),
    createNote(3, 5230),
    createNote(0, 5460),
    createNote(3, 5460),
    createNote(1, 5700),
    createNote(3, 5940),
    createNote(0, 6200, 1600),
    createNote(1, 10940),
    createNote(1, 11150),

    createNote(0, 11650),
    createNote(3, 11900),
    createNote(1, 12150),

    createNote(0, 12630),
    createNote(3, 13090),

    createNote(0, 13550),
    createNote(3, 13800),
    createNote(1, 14050),

    createNote(0, 14530),
    createNote(3, 14990),

    createNote(0, 15450),
    createNote(3, 15700),
    createNote(1, 15950),

    createNote(0, 16450),
    createNote(3, 16900),

    createNote(0, 17350),
    createNote(3, 17600),
    createNote(1, 17850),

    createNote(2, 18350, 500),
    createNote(0, 18800),

    createNote(0, 19320),
    createNote(3, 19570),
    createNote(1, 19810),

    createNote(2, 20320),
    createNote(0, 20670),

    createNote(0, 21130),
    createNote(3, 21380),
    createNote(1, 21630),

    createNote(2, 22130),
    createNote(0, 22580),

    createNote(0, 23050),
    createNote(3, 23300),
    createNote(2, 23550),
    createNote(1, 23800),

    createNote(1, 24080),
    createNote(3, 24080),
    createNote(1, 24310),
    createNote(3, 24310),
    createNote(1, 24540),
    createNote(3, 24540),
    createNote(1, 24770),
    createNote(3, 24770),

    createNote(0, 25050),
    createNote(2, 25280),
    createNote(1, 25510),
    createNote(3, 25740),

    createNote(0, 25970),
    createNote(2, 26400),
  ];
}
