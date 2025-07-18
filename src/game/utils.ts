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
    createNote(0, 830),
    createNote(1, 1780),
    createNote(2, 2730),
    createNote(3, 3680),

    createNote(0, 4430),
    createNote(2, 4660),
    createNote(1, 4890),
    createNote(3, 5120),

    createNote(0, 5360),
    createNote(3, 5360),
    createNote(0, 5590),
    createNote(3, 5590),
    createNote(1, 5830),
    createNote(3, 6070),
    createNote(0, 6330, 1600),
    createNote(1, 11070),
    createNote(1, 11280),

    createNote(0, 11780),
    createNote(3, 12030),
    createNote(1, 12280),

    createNote(0, 12760),
    createNote(3, 13220),

    createNote(0, 13680),
    createNote(3, 13930),
    createNote(1, 14180),

    createNote(0, 14660),
    createNote(3, 15120),

    createNote(0, 15580),
    createNote(3, 15830),
    createNote(1, 16080),

    createNote(0, 16580),
    createNote(3, 17030),

    createNote(0, 17480),
    createNote(3, 17730),
    createNote(1, 17980),

    createNote(2, 18480, 500),
    createNote(0, 18930),

    createNote(0, 19450),
    createNote(3, 19700),
    createNote(1, 19940),

    createNote(2, 20450),
    createNote(0, 20800),

    createNote(0, 21260),
    createNote(3, 21510),
    createNote(1, 21760),

    createNote(2, 22260),
    createNote(0, 22710),

    createNote(0, 23180),
    createNote(3, 23430),
    createNote(2, 23680),
    createNote(1, 23930),

    createNote(1, 24210),
    createNote(3, 24210),
    createNote(1, 24440),
    createNote(3, 24440),
    createNote(1, 24670),
    createNote(3, 24670),
    createNote(1, 24900),
    createNote(3, 24900),

    createNote(0, 25180),
    createNote(2, 25410),
    createNote(1, 25640),
    createNote(3, 25870),

    createNote(0, 26100),
    createNote(2, 26530),
  ];
}
