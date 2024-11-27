import {
  Judgment,
  LaneBackgroundEffect,
  LaneEffect,
  LongNoteState,
  Note,
  NoteType,
} from "./types";
import {
  FPS,
  GOOD_RANGE,
  GOOD_SCORE,
  INTERVAL_IN_LONG_NOTE_ACTIVE,
  JUDGEMENT_LINE_Y,
  JUDGEMENT_RANGE,
  LANE_COLORS,
  LANE_COUNT,
  LANE_WIDTH,
  NORMAL_RANGE,
  NORMAL_SCORE,
  PASSED_LINE_Y,
  PERFECT_RANGE,
  PERFECT_SCORE,
  SAFE_TIME_IN_LONG_NOTE_ACTIVE,
  TIME_CONSIDERING_PASSED,
} from "./constants";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private notes: Note[] = [];
  private activeNotes: Note[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private lastTimestamp: number = 0;
  private totalPauseTime: number = 0;
  private pauseStartTime: number = 0;
  private score: number = 0;
  private combo: number = 0;
  private currentJudgment: Judgment | null = null;
  private judgmentDisplayTime: number = 0;
  private lastLongNoteUpdate: { [key: number]: number } = {};
  private laneEffects: LaneEffect[] = Array(LANE_COUNT)
    .fill(null)
    .map(() => ({
      active: false,
      timestamp: 0,
    }));
  private laneBackgroundEffects: LaneBackgroundEffect[] = Array(LANE_COUNT)
    .fill(null)
    .map(() => ({
      active: false,
    }));

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;

    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    const keyMap: { [key: string]: number } = {
      KeyD: 0,
      KeyF: 1,
      KeyJ: 2,
      KeyK: 3,
    };

    window.addEventListener("keydown", (e) => {
      if (!this.isRunning || this.isPaused) return;
      const lane = keyMap[e.code];
      if (lane !== undefined) {
        this.handleKeyPress(lane);
      }
    });

    window.addEventListener("keyup", (e) => {
      if (!this.isRunning || this.isPaused) return;
      const lane = keyMap[e.code];
      if (lane !== undefined) {
        this.handleKeyRelease(lane);
      }
    });
  }

  public setNotes(notes: Note[]) {
    this.notes = [...notes].sort((a, b) => a.timing - b.timing);
  }

  public start() {
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastTimestamp = this.startTime;
    requestAnimationFrame(this.update.bind(this));
  }

  public stop() {
    this.isRunning = false;
    this.reset();
  }

  public pause() {
    this.isPaused = true;
    this.pauseStartTime = performance.now();
  }

  public resume() {
    if (this.isPaused) {
      this.totalPauseTime += performance.now() - this.pauseStartTime;
      this.isPaused = false;
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.update.bind(this));
    }
  }

  private reset() {
    this.notes = [];
    this.activeNotes = [];
    this.score = 0;
    this.combo = 0;
    this.currentJudgment = null;
    this.totalPauseTime = 0;
    this.pauseStartTime = 0;
  }

  private handleKeyPress(lane: number) {
    // 레인 백그라운드
    this.activateLaneBackgroundEffect(lane);

    const currentTime =
      performance.now() - this.startTime - this.totalPauseTime;
    const notesInLane = this.activeNotes.filter((note) => note.lane === lane);

    for (const note of notesInLane) {
      // 타이밍 구하기 (현재 시간 - 키를 누르는 타이밍)
      const timeDiff = note.timing - currentTime;

      // 짧은 노트인 경우
      if (note.type === NoteType.SHORT) {
        // 판정 범위에 있는 노트인지 확인
        if (this.getIsJudgementRange(timeDiff)) {
          // 판정
          this.judgeNote(timeDiff);
          // 판정이 노멀 이상이면 액티브 효과 주기
          if (this.getIsEffectiveNodeRange(timeDiff))
            this.activateLaneEffect(lane);
          // 액티브 노트 목록에서 제거
          this.activeNotes = this.activeNotes.filter((n) => n !== note);
          break;
        }
      }
      // 긴 노트이면서 아직 안 눌렀을 때
      else if (note.type === NoteType.LONG && !note.isHeld) {
        // 판정 범위에 있는 노트인지 확인
        if (this.getIsJudgementRange(timeDiff)) {
          // 판정
          this.judgeNote(timeDiff);
          // 판정이 노멀 이상인 경우
          if (this.getIsEffectiveNodeRange(timeDiff)) {
            // 액티브 효과 주기
            this.activateLaneEffect(lane, true);
            // 누른 상태로 변경
            note.isHeld = true;
            note.longNoteState = LongNoteState.HOLDING;
            this.lastLongNoteUpdate[note.lane] = note.timing;
          }
          break;
        }
      }
    }
  }

  private handleKeyRelease(lane: number) {
    const currentTime =
      performance.now() - this.startTime - this.totalPauseTime;
    const notesInLane = this.activeNotes.filter(
      (note) =>
        note.lane === lane &&
        note.type === NoteType.LONG &&
        note.isHeld &&
        note.longNoteState === LongNoteState.HOLDING,
    );

    this.deactivateLaneBackgroundEffect(lane);

    for (const note of notesInLane) {
      const noteEndTime = note.timing + (note.duration || 0);
      const timeDiff = noteEndTime - currentTime;

      this.deactivateLaneEffect(lane);

      // 놔야할 때가 아직 오지 않았는데 놓은 경우
      if (currentTime < noteEndTime - NORMAL_RANGE) {
        this.registerMiss();
        note.longNoteState = LongNoteState.MISSED;
      }
      // 놔야할 타이밍이 온 경우
      else if (this.getIsEffectiveNodeRange(timeDiff)) {
        this.judgeNote(timeDiff);
        note.longNoteState = LongNoteState.COMPLETED;
      }
      note.isHeld = false;
    }
  }

  private getIsEffectiveNodeRange(timeDiff: number) {
    return timeDiff + TIME_CONSIDERING_PASSED >= 0 && timeDiff <= NORMAL_RANGE;
  }

  private getIsJudgementRange(timeDiff: number) {
    return (
      timeDiff + TIME_CONSIDERING_PASSED >= 0 && timeDiff <= JUDGEMENT_RANGE
    );
  }

  private judgeNote(timeDiff: number) {
    if (timeDiff >= 0) {
      if (timeDiff <= PERFECT_RANGE) {
        this.registerPerfect();
      } else if (timeDiff <= GOOD_RANGE) {
        this.registerGood();
      } else if (timeDiff <= NORMAL_RANGE) {
        this.registerNormal();
      } else {
        this.registerMiss();
      }
    } else if (timeDiff < 0 && timeDiff + TIME_CONSIDERING_PASSED >= 0) {
      this.registerPerfect();
    }
  }

  private updateLongNotes(currentTime: number) {
    this.activeNotes.forEach((note) => {
      if (
        note.type === NoteType.LONG &&
        note.isHeld &&
        note.longNoteState === LongNoteState.HOLDING
      ) {
        const lastUpdate = this.lastLongNoteUpdate[note.lane] || 0;
        const noteEndTime = note.timing + (note.duration ?? 0);

        // 긴 노트를 놓기 전 범위 까지 콤보 증가
        if (
          currentTime - lastUpdate >= INTERVAL_IN_LONG_NOTE_ACTIVE &&
          currentTime >= note.timing &&
          currentTime <=
            noteEndTime - NORMAL_RANGE + SAFE_TIME_IN_LONG_NOTE_ACTIVE
        ) {
          this.registerPerfect();
          this.lastLongNoteUpdate[note.lane] = currentTime;
        }
        // 긴 노트를 놓는 타이밍이 지나도 누르고 있는 경우
        else if (currentTime - TIME_CONSIDERING_PASSED > noteEndTime) {
          this.registerMiss();
          note.longNoteState = LongNoteState.MISSED;
          this.deactivateLaneEffect(note.lane);
        }
      }
    });
  }

  private registerPerfect() {
    this.score += PERFECT_SCORE;
    this.combo++;
    this.currentJudgment = { text: "PERFECT", color: "#ffd700" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerGood() {
    this.score += GOOD_SCORE;
    this.combo++;
    this.currentJudgment = { text: "GOOD", color: "#00ff00" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerNormal() {
    this.score += NORMAL_SCORE;
    this.combo++;
    this.currentJudgment = { text: "NORMAL", color: "#0088ff" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerMiss() {
    this.combo = 0;
    this.currentJudgment = { text: "MISS", color: "#ff0000" };
    this.judgmentDisplayTime = performance.now();
  }

  private activateLaneEffect(lane: number, isLongNote: boolean = false) {
    this.laneEffects[lane] = {
      active: true,
      timestamp: isLongNote ? 0 : performance.now(),
    };
  }

  private deactivateLaneEffect(lane: number) {
    this.laneEffects[lane] = {
      active: false,
      timestamp: 0,
    };
  }

  private activateLaneBackgroundEffect(lane: number) {
    this.laneBackgroundEffects[lane] = {
      active: true,
    };
  }

  private deactivateLaneBackgroundEffect(lane: number) {
    this.laneBackgroundEffects[lane] = {
      active: false,
    };
  }

  private updateLaneEffects(currentTime: number) {
    this.laneEffects.forEach((effect, index) => {
      if (effect.active && effect.timestamp > 0) {
        if (currentTime - effect.timestamp > 100) {
          this.deactivateLaneEffect(index);
        }
      }
    });
  }

  // 판정 그리기
  private drawJudgment() {
    if (
      this.currentJudgment &&
      performance.now() - this.judgmentDisplayTime < 500
    ) {
      const elapsed = performance.now() - this.judgmentDisplayTime;
      const alpha = 1 - elapsed / 1000;

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 24px Arial";
      this.ctx.textAlign = "center";

      this.ctx.fillText(`COMBO`, this.canvas.width / 2, this.canvas.height / 3);

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 60px Arial";
      this.ctx.textAlign = "center";

      this.ctx.fillText(
        `${this.combo}`,
        this.canvas.width / 2,
        this.canvas.height / 3 + 50,
      );

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = this.currentJudgment.color;
      this.ctx.font = "bold 36px Arial";
      this.ctx.textAlign = "center";

      this.ctx.fillText(
        this.currentJudgment.text,
        this.canvas.width / 2,
        this.canvas.height - this.canvas.height / 4,
      );

      this.ctx.restore();
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < LANE_COUNT; i++) {
      // 1. 레인 경계선 그리기
      if (i < LANE_COUNT - 1) {
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.globalAlpha = 0.2;
        this.ctx.strokeStyle = "#fff";
        this.ctx.moveTo((i + 1) * LANE_WIDTH, 0);
        this.ctx.lineTo((i + 1) * LANE_WIDTH, this.canvas.height);
        this.ctx.stroke();
      }

      // 2. 키 누른 구간 액티브 효과
      if (this.laneBackgroundEffects[i].active) {
        // 그라데이션 생성
        const gradient = this.ctx.createLinearGradient(
          i * LANE_WIDTH,
          0,
          LANE_WIDTH,
          this.canvas.height,
        );
        gradient.addColorStop(0, "#000");
        gradient.addColorStop(1, LANE_COLORS[i]);

        // 그라데이션을 fillStyle에 설정
        this.ctx.fillStyle = gradient;

        // 사각형 그리기
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillRect(i * LANE_WIDTH, 0, LANE_WIDTH, this.canvas.height);
      }

      // 3. 노트 떨어지는 타이밍에 맞춰 눌렀을 때 효과
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = LANE_COLORS[i];
      this.ctx.lineWidth = this.laneEffects[i].active ? 10 : 4;

      if (this.laneEffects[i].active) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = LANE_COLORS[i];
      } else {
        this.ctx.shadowBlur = 0;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(i * LANE_WIDTH, JUDGEMENT_LINE_Y);
      this.ctx.lineTo((i + 1) * LANE_WIDTH, JUDGEMENT_LINE_Y);
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;

    const currentTime =
      performance.now() - this.startTime - this.totalPauseTime;

    // 노트 그리기
    for (const note of this.activeNotes) {
      const y = JUDGEMENT_LINE_Y - (note.timing - currentTime) / 2;

      this.ctx.fillStyle = LANE_COLORS[note.lane];
      if (note.type === NoteType.SHORT) {
        this.ctx.fillRect(note.lane * LANE_WIDTH, y - 20, LANE_WIDTH, 40);
      } else {
        const duration = note.duration || 0;
        const height = duration / 2;

        if (note.longNoteState === LongNoteState.HOLDING) {
          this.ctx.globalAlpha = 1;
        } else if (note.longNoteState === LongNoteState.MISSED) {
          this.ctx.globalAlpha = 0.3;
        } else {
          this.ctx.globalAlpha = 0.8;
        }

        this.ctx.fillRect(
          note.lane * LANE_WIDTH,
          y - height,
          LANE_WIDTH,
          height,
        );
      }
    }

    this.drawJudgment();

    // 점수, 콤보 그리기
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`Score: ${this.score}`, 10, 30);
    this.ctx.fillText(`Combo: ${this.combo}`, 10, 60);
  }

  private update(timestamp: number) {
    if (!this.isRunning || this.isPaused) return;

    const frameInterval = 1000 / FPS;

    const deltaTime = timestamp - this.lastTimestamp;

    // 프레임 간 간격이 목표 간격보다 작으면 건너뜀
    if (deltaTime < frameInterval) {
      requestAnimationFrame(this.update.bind(this));
      return;
    }

    this.lastTimestamp = timestamp;

    const currentTime = timestamp - this.startTime - this.totalPauseTime;

    this.updateLaneEffects(timestamp);
    this.updateLongNotes(currentTime);

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

    this.activeNotes = this.activeNotes.filter((note) => {
      const noteY = JUDGEMENT_LINE_Y - (note.timing - currentTime) / 2;

      if (noteY > JUDGEMENT_LINE_Y + PASSED_LINE_Y) {
        if (!note.isHeld && note.longNoteState !== LongNoteState.COMPLETED) {
          this.registerMiss();
          return false;
        }
      }

      if (note.type === NoteType.LONG) {
        const noteEndTime = note.timing + (note.duration || 0);
        return currentTime <= noteEndTime + TIME_CONSIDERING_PASSED;
      }

      return noteY <= JUDGEMENT_LINE_Y + PASSED_LINE_Y;
    });

    this.draw();
    requestAnimationFrame(this.update.bind(this));
  }
}
