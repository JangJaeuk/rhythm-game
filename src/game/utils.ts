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
    createNote(0, 1000),
    createNote(1, 1500),
    createNote(2, 2000),
    createNote(3, 2500),
    createNote(0, 3000, 2000),
    createNote(3, 3500, 2000),
    createNote(1, 4000),
    createNote(0, 6000),
    createNote(2, 6500),
    createNote(2, 7000),
    createNote(2, 7500),
    createNote(2, 8000),
    createNote(2, 8500),
  ];
}
