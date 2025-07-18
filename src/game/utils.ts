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
    createNote(0, 950),
    createNote(1, 1900),
    createNote(2, 2850),
    createNote(3, 3800),

    createNote(0, 4550),
    createNote(2, 4780),
    createNote(1, 5010),
    createNote(3, 5240),

    createNote(0, 5480),
    createNote(3, 5480),
    createNote(0, 5710),
    createNote(3, 5710),
    createNote(1, 5950),
    createNote(3, 6190),
    createNote(0, 6450, 1600),
    createNote(1, 11190),
    createNote(1, 11400),

    createNote(0, 11900),
    createNote(3, 12150),
    createNote(1, 12400),

    createNote(0, 12880),
    createNote(3, 13340),

    createNote(0, 13800),
    createNote(3, 14050),
    createNote(1, 14300),

    createNote(0, 14780),
    createNote(3, 15240),

    createNote(0, 15700),
    createNote(3, 15950),
    createNote(1, 16200),

    createNote(0, 16700),
    createNote(3, 17150),

    createNote(0, 17600),
    createNote(3, 17850),
    createNote(1, 18100),

    createNote(2, 18600, 500),
    createNote(0, 19050),

    createNote(0, 19570),
    createNote(3, 19820),
    createNote(1, 20060),

    createNote(2, 20570),
    createNote(0, 20920),

    createNote(0, 21380),
    createNote(3, 21630),
    createNote(1, 21880),

    createNote(2, 22380),
    createNote(0, 22830),

    createNote(0, 23300),
    createNote(3, 23550),
    createNote(2, 23800),
    createNote(1, 24050),

    createNote(1, 24330),
    createNote(3, 24330),
    createNote(1, 24560),
    createNote(3, 24560),
    createNote(1, 24790),
    createNote(3, 24790),
    createNote(1, 25020),
    createNote(3, 25020),

    createNote(0, 25300),
    createNote(2, 25530),
    createNote(1, 25760),
    createNote(3, 25990),

    createNote(0, 26220),
    createNote(2, 26650),
  ];
}
