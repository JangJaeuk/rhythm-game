import { Note, NoteType } from "./types";

export function createNote(
  lane: number,
  timing: number,
  duration?: number,
): Note {
  return {
    lane,
    timing,
    type: duration ? NoteType.LONG : NoteType.SHORT,
    duration,
    isHeld: false,
  };
}

export function createNotes(): Note[] {
  return [
    createNote(0, 3000),
    createNote(1, 3500),
    createNote(2, 4000),
    createNote(3, 4500),
    createNote(0, 5000, 2000),
    createNote(3, 5500, 2000),
    createNote(1, 6000),
    createNote(0, 8000),
    createNote(2, 8500),
    createNote(2, 8000),
    createNote(2, 9500),
    createNote(1, 10000),
    createNote(2, 10000),
    createNote(2, 10500),
  ];
}
