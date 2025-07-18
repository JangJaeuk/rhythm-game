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
    createNote(0, 850),
    createNote(1, 1800),
    createNote(2, 2750),
    createNote(3, 3700),

    createNote(0, 4450),
    createNote(2, 4680),
    createNote(1, 4910),
    createNote(3, 5140),

    createNote(0, 5380),
    createNote(3, 5380),
    createNote(0, 5610),
    createNote(3, 5610),
    createNote(1, 5850),
    createNote(3, 6090),
    createNote(0, 6350, 1600),
    createNote(1, 11090),
    createNote(1, 11300),

    createNote(0, 11800),
    createNote(3, 12050),
    createNote(1, 12300),

    createNote(0, 12780),
    createNote(3, 13240),

    createNote(0, 13700),
    createNote(3, 13950),
    createNote(1, 14200),

    createNote(0, 14680),
    createNote(3, 15140),

    createNote(0, 15600),
    createNote(3, 15850),
    createNote(1, 16100),

    createNote(0, 16600),
    createNote(3, 17050),

    createNote(0, 17500),
    createNote(3, 17750),
    createNote(1, 18000),

    createNote(2, 18500, 500),
    createNote(0, 18950),

    createNote(0, 19470),
    createNote(3, 19720),
    createNote(1, 19960),

    createNote(2, 20470),
    createNote(0, 20820),

    createNote(0, 21280),
    createNote(3, 21530),
    createNote(1, 21780),

    createNote(2, 22280),
    createNote(0, 22730),

    createNote(0, 23200),
    createNote(3, 23450),
    createNote(2, 23700),
    createNote(1, 23950),

    createNote(1, 24230),
    createNote(3, 24230),
    createNote(1, 24460),
    createNote(3, 24460),
    createNote(1, 24690),
    createNote(3, 24690),
    createNote(1, 24920),
    createNote(3, 24920),

    createNote(0, 25200),
    createNote(2, 25430),
    createNote(1, 25660),
    createNote(3, 25890),

    createNote(0, 26120),
    createNote(2, 26550),
  ];
}
