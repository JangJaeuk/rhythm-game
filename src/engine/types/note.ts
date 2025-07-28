export enum NoteType {
  SHORT = "SHORT",
  LONG = "LONG",
}

export enum LongNoteState {
  WAITING = "WAITING",
  HOLDING = "HOLDING",
  MISSED = "MISSED",
  COMPLETED = "COMPLETED",
}

export interface Note {
  lane: number;
  timing: number;
  type: NoteType;
  duration?: number;
  isHeld?: boolean;
  longNoteState?: LongNoteState;
  startCombo?: number;
}
