import {
  GOOD_RANGE,
  INTERVAL_IN_LONG_NOTE_ACTIVE,
  JUDGEMENT_RANGE,
  NORMAL_RANGE,
  PERFECT_RANGE,
  SAFE_TIME_IN_LONG_NOTE_ACTIVE,
  TIME_CONSIDERING_PASSED,
} from "../constants/gameBase";
import { LongNoteState, Note, NoteType } from "../types/note";
import { AudioManager } from "./AudioManager";
import { ScoreManager } from "./ScoreManager";

export interface NoteJudgement {
  type: "PERFECT" | "GOOD" | "NORMAL" | "MISS";
  lane: number;
}

export class NoteManager {
  private notes: Note[] = [];
  private activeNotes: Note[] = [];
  private lastLongNoteUpdate: { [key: number]: number } = {};

  constructor(
    private audioManager: AudioManager,
    private scoreManager: ScoreManager,
    private onJudgement: (judgement: NoteJudgement) => void
  ) {}

  public setNotes(notes: Note[]) {
    const adjustedNotes = notes.map((note) => ({
      ...note,
      timing: note.timing + AudioManager.latency,
    }));

    this.notes = [...adjustedNotes].sort((a, b) => a.timing - b.timing);
  }

  public reset() {
    this.notes = [];
    this.activeNotes = [];
    this.lastLongNoteUpdate = {};
  }

  public getActiveNotes(): Note[] {
    return this.activeNotes;
  }

  public updateNotes(
    currentTime: number,
    scaledJudgementLineY: number,
    scaledPassedLineY: number,
    canvasHeight: number
  ) {
    // 새로운 노트 활성화
    while (
      this.notes.length > 0 &&
      this.notes[0].timing <= currentTime + 2000
    ) {
      const note = this.notes.shift()!;
      if (note.type === NoteType.LONG) {
        note.longNoteState = LongNoteState.WAITING;
      }
      this.activeNotes.push(note);
    }

    // 활성 노트 업데이트 및 필터링
    this.activeNotes = this.activeNotes.filter((note) => {
      const noteY =
        scaledJudgementLineY -
        ((note.timing - currentTime) / 2) * (canvasHeight / 1080); // CANVAS_HEIGHT = 1080

      if (noteY > scaledJudgementLineY + scaledPassedLineY) {
        if (!note.isHeld && note.longNoteState !== LongNoteState.COMPLETED) {
          this.registerJudgement("MISS", note.lane);
          return false;
        }
      }

      if (note.type === NoteType.LONG) {
        const noteEndTime = note.timing + (note.duration || 0);
        return currentTime <= noteEndTime + TIME_CONSIDERING_PASSED;
      }

      return noteY <= scaledJudgementLineY + scaledPassedLineY;
    });
  }

  public handleKeyPress(lane: number): Note | null {
    const currentTime = this.audioManager.getCurrentTime();

    // 해당 레인의 판정 가능한 노트들 찾기
    const notesInLane = this.activeNotes.filter((note) => note.lane === lane);

    // 판정 범위 내의 노트들 중 가장 가까운 노트 찾기
    let closestNote: Note | null = null;
    let minTimeDiff = Infinity;

    for (const note of notesInLane) {
      const timeDiff = note.timing - currentTime;

      // 판정 범위 안에 있는 노트 중에서
      if (this.getIsJudgementRange(timeDiff)) {
        // 가장 가까운 노트 찾기
        const absTimeDiff = Math.abs(timeDiff);
        if (absTimeDiff < Math.abs(minTimeDiff)) {
          minTimeDiff = timeDiff;
          closestNote = note;
        }
      }
    }

    // 가장 가까운 노트 판정
    if (closestNote) {
      if (closestNote.type === NoteType.SHORT) {
        // 판정
        const judgement = this.judgeNote(minTimeDiff);
        if (judgement) {
          this.registerJudgement(judgement, lane);
          // 액티브 노트 목록에서 제거
          this.activeNotes = this.activeNotes.filter((n) => n !== closestNote);
          return closestNote;
        }
      }
      // 긴 노트이면서 아직 안 눌렀을 때
      else if (closestNote.type === NoteType.LONG && !closestNote.isHeld) {
        // 판정
        const judgement = this.judgeNote(minTimeDiff);
        if (judgement && this.getIsEffectiveNodeRange(minTimeDiff)) {
          this.registerJudgement(judgement, lane);
          // 현재 콤보 저장
          closestNote.startCombo = this.scoreManager.getCombo();
          // 누른 상태로 변경
          closestNote.isHeld = true;
          closestNote.longNoteState = LongNoteState.HOLDING;

          // 시작 시점을 노트의 정확한 타이밍으로 설정
          this.lastLongNoteUpdate[closestNote.lane] = closestNote.timing;
          return closestNote;
        }
      }
    }

    return null;
  }

  public handleKeyRelease(lane: number) {
    const currentTime = this.audioManager.getCurrentTime();

    const notesInLane = this.activeNotes.filter(
      (note) =>
        note.lane === lane &&
        note.type === NoteType.LONG &&
        note.isHeld &&
        note.longNoteState === LongNoteState.HOLDING
    );

    for (const note of notesInLane) {
      const noteEndTime = note.timing + (note.duration || 0);
      const timeDiff = noteEndTime - currentTime;

      // 놔야할 때가 아직 오지 않았는데 놓은 경우
      if (currentTime < noteEndTime - NORMAL_RANGE) {
        this.registerJudgement("MISS", lane);
        note.longNoteState = LongNoteState.MISSED;
      }
      // 놔야할 타이밍이 온 경우
      else if (this.getIsEffectiveNodeRange(timeDiff)) {
        const judgement = this.judgeNote(timeDiff);
        if (judgement) {
          this.registerJudgement(judgement, lane);
        }
        note.longNoteState = LongNoteState.COMPLETED;

        // 롱노트로 얻어야 할 총 콤보 수 계산
        const expectedComboGain =
          Math.ceil((note.duration || 0) / INTERVAL_IN_LONG_NOTE_ACTIVE) - 1;
        // 실제로 얻은 콤보 수 계산
        const actualComboGain =
          this.scoreManager.getCombo() - (note.startCombo || 0);

        // 콤보 수가 부족하면 보정
        if (actualComboGain < expectedComboGain) {
          const missingCombos = expectedComboGain - actualComboGain;

          for (let i = 0; i < missingCombos; i++) {
            // 판정 범위에 따라 다른 판정 적용
            if (Math.abs(timeDiff) <= PERFECT_RANGE) {
              this.registerJudgement("PERFECT", lane);
            } else if (Math.abs(timeDiff) <= GOOD_RANGE) {
              this.registerJudgement("GOOD", lane);
            } else {
              this.registerJudgement("NORMAL", lane);
            }
          }
        }
      }
      note.isHeld = false;
    }
  }

  public updateLongNotes(currentTime: number) {
    this.activeNotes.forEach((note) => {
      if (
        note.type === NoteType.LONG &&
        note.isHeld &&
        note.longNoteState === LongNoteState.HOLDING
      ) {
        const lastUpdate = this.lastLongNoteUpdate[note.lane] || 0;
        const noteEndTime = note.timing + (note.duration ?? 0);

        // 마지막 업데이트 이후 경과한 간격 수 계산
        const intervalsPassed = Math.floor(
          (currentTime - lastUpdate) / INTERVAL_IN_LONG_NOTE_ACTIVE
        );

        // 경과한 각 간격을 반복 처리
        for (let i = 0; i < intervalsPassed; i++) {
          const intervalTime =
            lastUpdate + (i + 1) * INTERVAL_IN_LONG_NOTE_ACTIVE;

          // 간격 시간이 유효한 범위 내에 있는지 확인
          if (
            intervalTime >= note.timing &&
            intervalTime <=
              noteEndTime - NORMAL_RANGE + SAFE_TIME_IN_LONG_NOTE_ACTIVE
          ) {
            this.registerJudgement("PERFECT", note.lane);
            this.lastLongNoteUpdate[note.lane] = intervalTime;
          }
        }

        // 노트가 끝난 후에도 누르고 있는 경우 처리
        if (currentTime - TIME_CONSIDERING_PASSED > noteEndTime) {
          this.registerJudgement("MISS", note.lane);
          note.longNoteState = LongNoteState.MISSED;
        }
      }
    });
  }

  private getIsEffectiveNodeRange(timeDiff: number) {
    return timeDiff + TIME_CONSIDERING_PASSED >= 0 && timeDiff <= NORMAL_RANGE;
  }

  private getIsJudgementRange(timeDiff: number) {
    return (
      timeDiff + TIME_CONSIDERING_PASSED >= 0 && timeDiff <= JUDGEMENT_RANGE
    );
  }

  private judgeNote(
    timeDiff: number
  ): "PERFECT" | "GOOD" | "NORMAL" | "MISS" | null {
    if (timeDiff >= 0) {
      if (timeDiff <= PERFECT_RANGE) {
        return "PERFECT";
      } else if (timeDiff <= GOOD_RANGE) {
        return "GOOD";
      } else if (timeDiff <= NORMAL_RANGE) {
        return "NORMAL";
      } else {
        return "MISS";
      }
    } else if (timeDiff < 0 && timeDiff + TIME_CONSIDERING_PASSED >= 0) {
      return "PERFECT";
    }
    return null;
  }

  private registerJudgement(
    type: "PERFECT" | "GOOD" | "NORMAL" | "MISS",
    lane: number
  ) {
    switch (type) {
      case "PERFECT":
        this.scoreManager.registerPerfect();
        break;
      case "GOOD":
        this.scoreManager.registerGood();
        break;
      case "NORMAL":
        this.scoreManager.registerNormal();
        break;
      case "MISS":
        this.scoreManager.registerMiss();
        break;
    }
    this.onJudgement({ type, lane });
  }
}
