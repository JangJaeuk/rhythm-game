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
}

export interface Judgment {
  text: string;
  color: string;
}

export interface LaneEffect {
  active: boolean;
  timestamp: number;
}

export interface LaneBackgroundEffect {
  active: boolean;
}
