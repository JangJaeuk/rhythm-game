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
    createNote(0, 1000),
    createNote(1, 1950),
    createNote(2, 2900),
    createNote(3, 3850),

    createNote(0, 4600),
    createNote(2, 4830),
    createNote(1, 5060),
    createNote(3, 5290),

    createNote(0, 5530),
    createNote(3, 5530),
    createNote(0, 5760),
    createNote(3, 5760),
    createNote(1, 6000),
    createNote(3, 6240),
    createNote(0, 6500, 1600),
    createNote(1, 11240),
    createNote(1, 11450),

    createNote(0, 11950),
    createNote(3, 12200),
    createNote(1, 12450),

    createNote(0, 12930),
    createNote(3, 13390),

    createNote(0, 13850),
    createNote(3, 14100),
    createNote(1, 14350),

    createNote(0, 14830),
    createNote(3, 15290),

    createNote(0, 15750),
    createNote(3, 16000),
    createNote(1, 16250),

    createNote(0, 16750),
    createNote(3, 17200),

    createNote(0, 17650),
    createNote(3, 17900),
    createNote(1, 18150),

    createNote(2, 18650, 500),
    createNote(0, 19100),

    createNote(0, 19620),
    createNote(3, 19870),
    createNote(1, 20110),

    createNote(2, 20620),
    createNote(0, 20970),

    createNote(0, 21430),
    createNote(3, 21680),
    createNote(1, 21930),

    createNote(2, 22430),
    createNote(0, 22880),

    createNote(0, 23350),
    createNote(3, 23600),
    createNote(2, 23850),
    createNote(1, 24100),

    createNote(1, 24380),
    createNote(3, 24380),
    createNote(1, 24610),
    createNote(3, 24610),
    createNote(1, 24840),
    createNote(3, 24840),
    createNote(1, 25070),
    createNote(3, 25070),

    createNote(0, 25350),
    createNote(2, 25580),
    createNote(1, 25810),
    createNote(3, 26040),

    createNote(0, 26270),
    createNote(2, 26700),
  ];
}
