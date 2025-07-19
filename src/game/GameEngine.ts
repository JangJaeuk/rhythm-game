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
  SPEAKER_DELAY_OFFSET,
  TIME_CONSIDERING_PASSED,
  TIMING_RATIO,
} from "./constants/gameBase";
import {
  Judgment,
  LaneBackgroundEffect,
  LaneEffect,
  LongNoteState,
  Note,
  NoteType,
} from "./types";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: HTMLAudioElement | null;
  private notes: Note[] = [];
  private activeNotes: Note[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private audioStartTime: number = 0;  // 오디오 시작 시점의 currentTime
  private lastTimestamp: number = 0;
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
  private onGameOver: () => void;
  private dataArray?: Uint8Array;

  private static audioContext?: AudioContext;
  private static analyser?: AnalyserNode;
  private static audioSource?: MediaElementAudioSourceNode;
  private static isAudioInitialized: boolean = false;
  private static connectedAudioElement?: HTMLAudioElement;

  score: number = 0;
  maxCombo: number = 0;
  perfectCount: number = 0;
  goodCount: number = 0;
  normalCount: number = 0;
  missCount: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    audio: HTMLAudioElement | null,
    onGameOver: () => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;
    this.audio = audio;
    this.audio?.addEventListener("ended", () => {
      this.handleGameOver();
    });
    this.onGameOver = onGameOver;

    if (audio) {
      this.initializeAudio(audio);
    }

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
    // 소수점 제거
    const baseLatency = Math.floor((GameEngine.audioContext?.baseLatency || 0) * 100000);

    // 533ms 기준으로 baseLatency 차이에 따른 타이밍 조정
    const latencyDiff = baseLatency - SPEAKER_DELAY_OFFSET;
    const timingOffset = Math.floor(latencyDiff * TIMING_RATIO);
    
    const adjustedNotes = notes.map(note => ({
        ...note,
        timing: note.timing + timingOffset
    }));

    this.notes = [...adjustedNotes].sort((a, b) => a.timing - b.timing);
  }

  public start() {
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastTimestamp = this.startTime;
    this.audioStartTime = this.audio?.currentTime || 0;

    if (GameEngine.audioContext?.state === "suspended") {
      GameEngine.audioContext.resume();
    }

    requestAnimationFrame(this.update.bind(this));
  }

  public stop() {
    this.isRunning = false;
    this.reset();
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
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
    this.maxCombo = 0;
    this.currentJudgment = null;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.normalCount = 0;
    this.missCount = 0;
  }

  private handleKeyPress(lane: number) {
    // 레인 백그라운드
    this.activateLaneBackgroundEffect(lane);

    // 오디오 시간 기준으로 현재 시간 계산
    const currentAudioTime = (this.audio?.currentTime || 0) - this.audioStartTime;
    const currentTime = currentAudioTime * 1000; // 초를 밀리초로 변환

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
            this.lastLongNoteUpdate[note.lane] = currentTime;
          }
          break;
        }
      }
    }
  }

  private handleKeyRelease(lane: number) {
    // 오디오 시간 기준으로 현재 시간 계산
    const currentAudioTime = (this.audio?.currentTime || 0) - this.audioStartTime;
    const currentTime = currentAudioTime * 1000; // 초를 밀리초로 변환

    const notesInLane = this.activeNotes.filter(
      (note) =>
        note.lane === lane &&
        note.type === NoteType.LONG &&
        note.isHeld &&
        note.longNoteState === LongNoteState.HOLDING
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
            this.registerPerfect();
            this.lastLongNoteUpdate[note.lane] = intervalTime;
          }
        }

        // 노트가 끝난 후에도 누르고 있는 경우 처리
        if (currentTime - TIME_CONSIDERING_PASSED > noteEndTime) {
          this.registerMiss();
          note.longNoteState = LongNoteState.MISSED;
          this.deactivateLaneEffect(note.lane);
        }
      }
    });
  }

  private registerPerfect() {
    const comboMultiplier = this.getComboMultiplier();
    this.score += PERFECT_SCORE * comboMultiplier;
    this.combo++;
    this.perfectCount++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.currentJudgment = { text: "PERFECT", color: "#ffd700" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerGood() {
    const comboMultiplier = this.getComboMultiplier();
    this.score += GOOD_SCORE * comboMultiplier;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.goodCount++;
    this.currentJudgment = { text: "GOOD", color: "#00ff00" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerNormal() {
    const comboMultiplier = this.getComboMultiplier();
    this.score += NORMAL_SCORE * comboMultiplier;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.normalCount++;
    this.currentJudgment = { text: "NORMAL", color: "#0088ff" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerMiss() {
    this.combo = 0;
    this.currentJudgment = { text: "MISS", color: "#ff0000" };
    this.judgmentDisplayTime = performance.now();
    this.missCount++;
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

  // 게임 종료 처리 함수 추가
  private handleGameOver() {
    this.isRunning = false;
    this.onGameOver();
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

      // Display "COMBO" text
      this.ctx.fillText(
        `COMBO`,
        this.canvas.width / 2,
        this.canvas.height / 3 - 60
      );

      // Display combo count
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 60px Arial";
      this.ctx.textAlign = "center";

      this.ctx.fillText(
        `${this.combo}`,
        this.canvas.width / 2,
        this.canvas.height / 3
      );

      const comboMultiplier = this.getComboMultiplier();
      if (comboMultiplier >= 1.2) {
        this.ctx.font = "bold 24px Arial";
        this.ctx.fillText(
          `(x${comboMultiplier.toFixed(1)})`,
          this.canvas.width / 2,
          this.canvas.height / 3 + 40
        );
      }

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = this.currentJudgment.color;
      this.ctx.font = "bold 36px Arial";
      this.ctx.textAlign = "center";

      // Display judgment text
      this.ctx.fillText(
        this.currentJudgment.text,
        this.canvas.width / 2,
        this.canvas.height - this.canvas.height / 4
      );

      this.ctx.restore();
    }
  }

  // 비주얼라이저 그리기 함수 추가
  private drawVisualizer() {
    if (!GameEngine.analyser || !this.dataArray) return;

    try {
      GameEngine.analyser.getByteFrequencyData(this.dataArray);

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const radius = 40;

      const barCount = 60;
      const angleStep = (Math.PI * 1.5) / barCount;
      const bandSize = Math.floor(this.dataArray.length / barCount);

      this.ctx.save();

      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep - Math.PI / 4;

        // 주파수 대역의 평균값 계산
        const start = i * bandSize;
        const end = start + bandSize;
        const bandData = this.dataArray.slice(start, end);
        const averageValue =
          bandData.reduce((sum, value) => sum + value, 0) / bandData.length;

        // 높이 계산
        const minHeight = 10;
        const maxHeight = 30;
        const heightRange = maxHeight - minHeight;
        const normalizedValue = Math.pow(averageValue / 255, 1.5);
        const height = minHeight + heightRange * normalizedValue;

        const innerX = centerX + Math.cos(angle) * radius;
        const innerY = centerY + Math.sin(angle) * radius;
        const outerX = centerX + Math.cos(angle) * (radius + height);
        const outerY = centerY + Math.sin(angle) * (radius + height);

        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(innerX, innerY);
        this.ctx.lineTo(outerX, outerY);
        this.ctx.stroke();
      }

      this.ctx.restore();
    } catch (error) {
      console.error("Error in drawVisualizer:", error);
    }
  }

  // 기존 draw 함수 수정
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
          this.canvas.height
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

    // 오디오 시간을 기준으로 게임 시간 계산
    const currentAudioTime = (this.audio?.currentTime || 0) - this.audioStartTime;
    const currentTime = currentAudioTime * 1000; // 초를 밀리초로 변환

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
          height
        );
      }
    }

    // 비주얼라이저 그리기 (콤보와 점수 사이에)
    if (this.isRunning) {
      this.drawVisualizer();
    }

    // 판정 표시 (기존 코드)
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

    if (deltaTime < frameInterval) {
      requestAnimationFrame(this.update.bind(this));
      return;
    }

    this.lastTimestamp = timestamp;

    // 오디오 시간 기준으로 게임 시간 계산
    const currentAudioTime = (this.audio?.currentTime || 0) - this.audioStartTime;
    const currentTime = currentAudioTime * 1000; // 초를 밀리초로 변환

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

  // 오디오 초기화 함수 추가
  private initializeAudio(audio: HTMLAudioElement) {
    try {
      // 이미 같은 오디오 요소가 연결되어 있다면 dataArray만 초기화
      if (
        GameEngine.connectedAudioElement === audio &&
        GameEngine.isAudioInitialized
      ) {
        console.log("Reusing existing audio connection");
        if (GameEngine.analyser) {
          const bufferLength = GameEngine.analyser.frequencyBinCount;
          this.dataArray = new Uint8Array(bufferLength);
        }
        return;
      }

      // 새로운 연결이 필요한 경우
      if (!GameEngine.audioContext) {
        GameEngine.audioContext = new AudioContext();
        GameEngine.analyser = GameEngine.audioContext.createAnalyser();
        GameEngine.audioSource =
          GameEngine.audioContext.createMediaElementSource(audio);

        GameEngine.audioSource.connect(GameEngine.analyser);
        GameEngine.analyser.connect(GameEngine.audioContext.destination);

        GameEngine.analyser.fftSize = 256;
        const bufferLength = GameEngine.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        GameEngine.connectedAudioElement = audio;
        GameEngine.isAudioInitialized = true;
      }
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }

  private getComboMultiplier(): number {
    if (this.combo >= 60) return 1.5;
    else if (this.combo >= 40) return 1.3;
    else if (this.combo >= 20) return 1.2;
    else return 1.0;
  }
}
