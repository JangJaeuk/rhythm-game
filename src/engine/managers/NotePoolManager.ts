import { LongNoteState, Note, NoteType } from "../types/note";

/**
 * 노트 객체를 재사용하기 위한 풀 매니저
 */
export class NotePoolManager {
  private shortNotePool: Note[] = [];
  private longNotePool: Note[] = [];
  private readonly INITIAL_POOL_SIZE = 50;
  private readonly EXPAND_SIZE = 20;

  constructor() {
    this.initializePools();
  }

  private initializePools(): void {
    // 숏노트 풀 초기화
    for (let i = 0; i < this.INITIAL_POOL_SIZE; i++) {
      this.shortNotePool.push(this.createNote(NoteType.SHORT));
    }

    // 롱노트 풀 초기화
    for (let i = 0; i < this.INITIAL_POOL_SIZE; i++) {
      this.longNotePool.push(this.createNote(NoteType.LONG));
    }
  }

  private createNote(type: NoteType): Note {
    return {
      lane: 0,
      timing: 0,
      type,
      duration: type === NoteType.LONG ? 0 : undefined,
      isHeld: type === NoteType.LONG ? false : undefined,
      longNoteState: type === NoteType.LONG ? LongNoteState.WAITING : undefined,
      startCombo: 0,
    };
  }

  private expandPool(type: NoteType): void {
    const pool =
      type === NoteType.SHORT ? this.shortNotePool : this.longNotePool;
    for (let i = 0; i < this.EXPAND_SIZE; i++) {
      pool.push(this.createNote(type));
    }
  }

  /**
   * 풀에서 노트 객체를 가져옴
   */
  acquire(type: NoteType): Note {
    const pool =
      type === NoteType.SHORT ? this.shortNotePool : this.longNotePool;

    if (pool.length === 0) {
      this.expandPool(type);
    }

    const note = pool.pop()!;
    this.resetNote(note);
    return note;
  }

  /**
   * 사용이 끝난 노트 객체를 풀에 반환
   */
  release(note: Note): void {
    if (note.type === NoteType.SHORT) {
      this.shortNotePool.push(note);
    } else {
      this.longNotePool.push(note);
    }
  }

  /**
   * 노트 객체 초기화
   */
  private resetNote(note: Note): void {
    note.lane = 0;
    note.timing = 0;
    note.startCombo = 0;

    if (note.type === NoteType.LONG) {
      note.duration = 0;
      note.isHeld = false;
      note.longNoteState = LongNoteState.WAITING;
    }
  }
}
