import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
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
} from "./constants/gameBase";
import {
  Judgment,
  LaneBackgroundEffect,
  LaneEffect,
  LongNoteState,
  Note,
  NoteType,
} from "./types";
import { measureAudioLatency } from "./utils";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: HTMLAudioElement | null;
  private notes: Note[] = [];
  private activeNotes: Note[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private audioStartTime: number = 0; // 오디오 시작 시점의 currentTime
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
  private previousHeights: number[] = [];
  private readonly SMOOTHING_FACTOR = 0.3;

  private static audioContext?: AudioContext;
  private static analyser?: AnalyserNode;
  private static audioSource?: MediaElementAudioSourceNode;
  private static isAudioInitialized: boolean = false;
  private static connectedAudioElement?: HTMLAudioElement;
  private static latency: number = 0;

  score: number = 0;
  maxCombo: number = 0;
  perfectCount: number = 0;
  goodCount: number = 0;
  normalCount: number = 0;
  missCount: number = 0;

  private previousIntensities: number[] = [];
  private readonly HISTORY_SIZE = 4;
  private maxIntensity: number = 0;
  private readonly DECAY_FACTOR = 0.95; // 최대값 감쇠 계수

  // 캔버스 크기에 따른 스케일 계산
  private get scale() {
    return this.canvas.width / CANVAS_WIDTH;
  }

  // 실제 레인 너비 계산
  private get scaledLaneWidth() {
    return LANE_WIDTH * this.scale;
  }

  // 실제 판정선 Y 좌표 계산
  private get scaledJudgementLineY() {
    return JUDGEMENT_LINE_Y * (this.canvas.height / CANVAS_HEIGHT);
  }

  // 실제 노트 통과 Y 좌표 계산
  private get scaledPassedLineY() {
    return PASSED_LINE_Y * (this.canvas.height / CANVAS_HEIGHT);
  }

  // 마우스/터치 클릭 위치로 레인 인덱스 계산
  private getLaneFromPosition(x: number): number {
    const relativeX = x / this.scale; // 실제 캔버스 크기를 고려한 상대 좌표
    return Math.floor(relativeX / LANE_WIDTH);
  }

  // 마우스/터치 입력 처리
  public handleClick(x: number) {
    if (!this.isRunning || this.isPaused) return;

    const lane = this.getLaneFromPosition(x);
    if (lane >= 0 && lane < LANE_COUNT) {
      this.handleKeyPress(lane);
    }
  }

  // 마우스/터치 릴리즈 처리
  public handleRelease(x: number) {
    if (!this.isRunning || this.isPaused) return;

    const lane = this.getLaneFromPosition(x);
    if (lane >= 0 && lane < LANE_COUNT) {
      this.handleKeyRelease(lane);
    }
  }

  // 터치 시작 처리
  public handleTouchStart(touchId: number, x: number) {
    if (!this.isRunning || this.isPaused) return;
    
    const lane = this.getLaneFromPosition(x);
    if (lane >= 0 && lane < LANE_COUNT) {
      // 이전에 다른 레인을 누르고 있었다면 해제
      const oldLane = this.touchLaneMap.get(touchId);
      if (oldLane !== undefined && oldLane !== lane) {
        this.handleTouchEnd(touchId);
      }

      // 새로운 레인 터치 처리
      this.touchLaneMap.set(touchId, lane);
      const activeTouches = this.activeTouchesPerLane.get(lane)!;
      if (!activeTouches.has(touchId)) {
        activeTouches.add(touchId);
        if (activeTouches.size === 1) {
          this.handleKeyPress(lane);
        }
      }
    }
  }

  // 터치 종료 처리
  public handleTouchEnd(touchId: number) {
    if (!this.isRunning || this.isPaused) return;
    
    const lane = this.touchLaneMap.get(touchId);
    if (lane !== undefined) {
      const activeTouches = this.activeTouchesPerLane.get(lane)!;
      activeTouches.delete(touchId);
      
      if (activeTouches.size === 0) {
        this.handleKeyRelease(lane);
      }
      
      this.touchLaneMap.delete(touchId);
    }
  }

  private touchLaneMap: Map<number, number> = new Map();
  private activeTouchesPerLane: Map<number, Set<number>> = new Map();

  private initializeLaneState() {
    this.activeTouchesPerLane.clear();
    for (let i = 0; i < LANE_COUNT; i++) {
      this.activeTouchesPerLane.set(i, new Set());
    }
  }

  constructor(
    canvas: HTMLCanvasElement,
    audio: HTMLAudioElement | null,
    onGameOver: () => void,
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

    this.initializeAudio();
    this.initializeLaneState();

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
    const adjustedNotes = notes.map((note) => ({
      ...note,
      timing: note.timing + GameEngine.latency,
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

  // 게임 상태 초기화 시 모든 레인 이펙트도 초기화
  public stop() {
    this.isRunning = false;
    this.touchLaneMap.clear();
    this.initializeLaneState();
    this.reset();

    // 모든 레인 이펙트 초기화
    for (let i = 0; i < LANE_COUNT; i++) {
      this.deactivateLaneBackgroundEffect(i);
      this.deactivateLaneEffect(i);
    }
  }

  public pause() {
    this.isPaused = true;
    this.touchLaneMap.clear();
    this.initializeLaneState();

    // 모든 레인 이펙트 초기화
    for (let i = 0; i < LANE_COUNT; i++) {
      this.deactivateLaneBackgroundEffect(i);
      this.deactivateLaneEffect(i);
    }
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
    const currentAudioTime =
      (this.audio?.currentTime || 0) - this.audioStartTime;
    const currentTime = currentAudioTime * 1000; // 초를 밀리초로 변환

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
        this.judgeNote(minTimeDiff);
        // 판정이 노멀 이상이면 액티브 효과 주기
        if (this.getIsEffectiveNodeRange(minTimeDiff)) {
          this.activateLaneEffect(lane);
        }
        // 액티브 노트 목록에서 제거
        this.activeNotes = this.activeNotes.filter((n) => n !== closestNote);
      }
      // 긴 노트이면서 아직 안 눌렀을 때
      else if (closestNote.type === NoteType.LONG && !closestNote.isHeld) {
        // 판정
        this.judgeNote(minTimeDiff);
        // 판정이 노멀 이상인 경우
        if (this.getIsEffectiveNodeRange(minTimeDiff)) {
          // 액티브 효과 주기
          this.activateLaneEffect(lane, true);
          // 누른 상태로 변경
          closestNote.isHeld = true;
          closestNote.longNoteState = LongNoteState.HOLDING;
          this.lastLongNoteUpdate[closestNote.lane] = currentTime;
        }
      }
    }
  }

  private handleKeyRelease(lane: number) {
    // 오디오 시간 기준으로 현재 시간 계산
    const currentAudioTime =
      (this.audio?.currentTime || 0) - this.audioStartTime;
    const currentTime = currentAudioTime * 1000; // 초를 밀리초로 변환

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

        // 마지막 업데이트 이후 경과한 간격 수 계산
        const intervalsPassed = Math.floor(
          (currentTime - lastUpdate) / INTERVAL_IN_LONG_NOTE_ACTIVE,
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
        this.canvas.height / 3 - 60,
      );

      // Display combo count
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 60px Arial";
      this.ctx.textAlign = "center";

      this.ctx.fillText(
        `${this.combo}`,
        this.canvas.width / 2,
        this.canvas.height / 3,
      );

      const comboMultiplier = this.getComboMultiplier();
      if (comboMultiplier >= 1.2) {
        this.ctx.font = "bold 24px Arial";
        this.ctx.fillText(
          `(x${comboMultiplier.toFixed(1)})`,
          this.canvas.width / 2,
          this.canvas.height / 3 + 40,
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
        this.canvas.height - this.canvas.height / 4,
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
      const radius = 30; // 원 크기 감소

      const barCount = 80;
      const angleStep = (Math.PI * 2) / barCount;

      // 주파수 데이터를 로그 스케일로 재배치
      const frequencyData = this.processFrequencyData(this.dataArray, barCount);

      // 초기화가 필요한 경우 previousHeights 배열 초기화
      if (this.previousHeights.length !== barCount) {
        this.previousHeights = new Array(barCount).fill(0);
      }

      this.ctx.save();

      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep;

        // 부드러운 애니메이션을 위한 높이 보간
        const targetHeight = this.normalizeHeight(frequencyData[i]);
        this.previousHeights[i] =
          this.previousHeights[i] * (1 - this.SMOOTHING_FACTOR) +
          targetHeight * this.SMOOTHING_FACTOR;

        const height = this.previousHeights[i];

        // 그라데이션 생성
        const gradient = this.ctx.createLinearGradient(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          centerX + Math.cos(angle) * (radius + height),
          centerY + Math.sin(angle) * (radius + height),
        );

        // 주파수에 따른 색상 계산
        const hue = (i / barCount) * 360;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 80%, 0.2)`);

        const innerX = centerX + Math.cos(angle) * radius;
        const innerY = centerY + Math.sin(angle) * radius;
        const outerX = centerX + Math.cos(angle) * (radius + height);
        const outerY = centerY + Math.sin(angle) * (radius + height);

        // 막대 그리기
        this.ctx.beginPath();
        this.ctx.lineCap = "round";
        this.ctx.lineWidth = ((Math.PI * radius * 2) / barCount) * 0.7; // 막대 두께 조정
        this.ctx.strokeStyle = gradient;
        this.ctx.moveTo(innerX, innerY);
        this.ctx.lineTo(outerX, outerY);
        this.ctx.stroke();
      }

      // 중앙 원 그리기
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2);
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.restore();
    } catch (error) {
      console.error("Error in drawVisualizer:", error);
    }
  }

  private processFrequencyData(
    data: Uint8Array,
    targetLength: number,
  ): number[] {
    const dataLength = data.length;

    // 비트와 멜로디 주파수 대역 분리
    const bassStart = Math.floor(dataLength * 0.05); // ~100Hz
    const bassEnd = Math.floor(dataLength * 0.15); // ~300Hz
    const melodyStart = Math.floor(dataLength * 0.15); // ~300Hz
    const melodyEnd = Math.floor(dataLength * 0.4); // ~2kHz

    // 비트(저주파) 대역의 에너지 계산
    let bassSum = 0;
    for (let i = bassStart; i < bassEnd; i++) {
      bassSum += data[i];
    }
    const bassEnergy = bassSum / (bassEnd - bassStart);

    // 멜로디 대역의 에너지 계산
    let melodySum = 0;
    let maxValue = 0;
    for (let i = melodyStart; i < melodyEnd; i++) {
      melodySum += data[i];
      maxValue = Math.max(maxValue, data[i]);
    }
    const melodyAvg = melodySum / (melodyEnd - melodyStart);

    // 비트와 멜로디 조합
    const currentIntensity = Math.max(
      bassEnergy * 1.2, // 비트에 가중치
      maxValue * 0.7 + melodyAvg * 0.3,
    );

    // 최대값 업데이트 (서서히 감소하는 최대값)
    this.maxIntensity = Math.max(
      currentIntensity,
      this.maxIntensity * this.DECAY_FACTOR,
    );

    // 이전 값들과 비교하여 변화 감지
    this.previousIntensities.push(currentIntensity);
    if (this.previousIntensities.length > this.HISTORY_SIZE) {
      this.previousIntensities.shift();
    }

    // 변화량 계산 (최근 값들의 변동성)
    let variability = 0;
    for (let i = 1; i < this.previousIntensities.length; i++) {
      const delta = Math.abs(
        this.previousIntensities[i] - this.previousIntensities[i - 1],
      );
      variability += delta;
    }
    variability /= this.previousIntensities.length;

    // 동적 범위 조정을 위한 정규화
    const normalizedIntensity = currentIntensity / (this.maxIntensity || 1);

    // 변화량에 따른 증폭 및 진동 효과
    const oscillation = Math.sin(Date.now() / 50) * 0.1; // 미세한 진동 추가
    const amplificationFactor = 0.7 + variability / 50 + oscillation;

    // 최종 강도 계산 (더 부드러운 곡선)
    const amplifiedIntensity =
      Math.pow(normalizedIntensity, 0.4) * 255 * amplificationFactor;

    return new Array(targetLength).fill(amplifiedIntensity);
  }

  private normalizeHeight(value: number): number {
    const minHeight = 2; // 최소 높이 더 감소
    const maxHeight = 18; // 최대 높이 감소
    const heightRange = maxHeight - minHeight;

    // 더 부드러운 반응 곡선
    const t = value / 255;
    const smoothValue = t * t * (3 - 2 * t); // 부드러운 보간
    return minHeight + heightRange * smoothValue;
  }

  private readonly PAUSE_BUTTON = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    margin: 20,
  };

  // 일시정지 버튼 클릭 체크
  public isPauseButtonClicked(x: number, y: number): boolean {
    if (!this.isRunning || this.isPaused) return false;

    const scale = this.scale;
    const buttonX =
      this.canvas.width -
      (this.PAUSE_BUTTON.width + this.PAUSE_BUTTON.margin) * scale;
    const buttonY = this.PAUSE_BUTTON.margin * scale;
    const buttonWidth = this.PAUSE_BUTTON.width * scale;
    const buttonHeight = this.PAUSE_BUTTON.height * scale;

    return (
      x >= buttonX &&
      x <= buttonX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    );
  }

  // 일시정지 버튼 그리기
  private drawPauseButton() {
    if (!this.isRunning || this.isPaused) return;

    const scale = this.scale;
    const { width, height, margin } = this.PAUSE_BUTTON;

    // 버튼 위치 계산
    const x = this.canvas.width - (width + margin) * scale;
    const y = margin * scale;

    // 반투명 배경
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width * scale, height * scale, 8 * scale);
    this.ctx.fill();

    // 일시정지 아이콘
    this.ctx.fillStyle = "#ffffff";
    const barWidth = 4 * scale;
    const barHeight = 16 * scale;
    const barMargin = 12 * scale;

    // 왼쪽 바
    this.ctx.fillRect(
      x + barMargin,
      y + (height * scale - barHeight) / 2,
      barWidth,
      barHeight,
    );

    // 오른쪽 바
    this.ctx.fillRect(
      x + width * scale - barMargin - barWidth,
      y + (height * scale - barHeight) / 2,
      barWidth,
      barHeight,
    );
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
        this.ctx.moveTo((i + 1) * this.scaledLaneWidth, 0);
        this.ctx.lineTo((i + 1) * this.scaledLaneWidth, this.canvas.height);
        this.ctx.stroke();
      }

      // 2. 키 누른 구간 액티브 효과
      if (this.laneBackgroundEffects[i].active) {
        // 그라데이션 생성
        const gradient = this.ctx.createLinearGradient(
          i * this.scaledLaneWidth,
          0,
          this.scaledLaneWidth,
          this.canvas.height,
        );
        gradient.addColorStop(0, "#000");
        gradient.addColorStop(1, LANE_COLORS[i]);

        // 그라데이션을 fillStyle에 설정
        this.ctx.fillStyle = gradient;

        // 사각형 그리기
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillRect(
          i * this.scaledLaneWidth,
          0,
          this.scaledLaneWidth,
          this.canvas.height,
        );
      }

      // 3. 노트 떨어지는 타이밍에 맞춰 눌렀을 때 효과
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = LANE_COLORS[i];
      this.ctx.lineWidth = this.laneEffects[i].active
        ? 10 * this.scale
        : 4 * this.scale;

      if (this.laneEffects[i].active) {
        this.ctx.shadowBlur = 15 * this.scale;
        this.ctx.shadowColor = LANE_COLORS[i];
      } else {
        this.ctx.shadowBlur = 0;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(i * this.scaledLaneWidth, this.scaledJudgementLineY);
      this.ctx.lineTo(
        (i + 1) * this.scaledLaneWidth,
        this.scaledJudgementLineY,
      );
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;

    // 오디오 시간을 기준으로 게임 시간 계산
    const currentAudioTime =
      (this.audio?.currentTime || 0) - this.audioStartTime;
    const currentTime = currentAudioTime * 1000; // 초를 밀리초로 변환

    // 노트 그리기
    for (const note of this.activeNotes) {
      const y =
        this.scaledJudgementLineY -
        ((note.timing - currentTime) / 2) *
          (this.canvas.height / CANVAS_HEIGHT);

      this.ctx.fillStyle = LANE_COLORS[note.lane];
      if (note.type === NoteType.SHORT) {
        const noteHeight = 40 * this.scale;
        this.ctx.fillRect(
          note.lane * this.scaledLaneWidth,
          y - noteHeight / 2,
          this.scaledLaneWidth,
          noteHeight,
        );
      } else {
        const duration = note.duration || 0;
        const height = (duration / 2) * (this.canvas.height / CANVAS_HEIGHT);

        if (note.longNoteState === LongNoteState.HOLDING) {
          this.ctx.globalAlpha = 1;
        } else if (note.longNoteState === LongNoteState.MISSED) {
          this.ctx.globalAlpha = 0.3;
        } else {
          this.ctx.globalAlpha = 0.8;
        }

        this.ctx.fillRect(
          note.lane * this.scaledLaneWidth,
          y - height,
          this.scaledLaneWidth,
          height,
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
    this.ctx.font = `${24 * this.scale}px Arial`;
    this.ctx.textAlign = "left";
    this.ctx.fillText(`Score: ${this.score}`, 10 * this.scale, 30 * this.scale);
    this.ctx.fillText(`Combo: ${this.combo}`, 10 * this.scale, 60 * this.scale);

    // 일시정지 버튼 그리기
    this.drawPauseButton();
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
    const currentAudioTime =
      (this.audio?.currentTime || 0) - this.audioStartTime;
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
      const noteY =
        this.scaledJudgementLineY -
        ((note.timing - currentTime) / 2) *
          (this.canvas.height / CANVAS_HEIGHT);

      if (noteY > this.scaledJudgementLineY + this.scaledPassedLineY) {
        if (!note.isHeld && note.longNoteState !== LongNoteState.COMPLETED) {
          this.registerMiss();
          return false;
        }
      }

      if (note.type === NoteType.LONG) {
        const noteEndTime = note.timing + (note.duration || 0);
        return currentTime <= noteEndTime + TIME_CONSIDERING_PASSED;
      }

      return noteY <= this.scaledJudgementLineY + this.scaledPassedLineY;
    });

    this.draw();
    requestAnimationFrame(this.update.bind(this));
  }

  // 오디오 초기화 함수 추가
  private async initializeAudio() {
    try {
      const bufferLength = GameEngine.analyser?.frequencyBinCount || 0;
      this.dataArray = new Uint8Array(bufferLength);
      this.previousIntensities = [];
      this.maxIntensity = 0;
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

  static async initializeAudioBase(audio: HTMLAudioElement) {
    try {
      // 이미 초기화되어 있고 같은 오디오 엘리먼트인 경우
      if (
        GameEngine.connectedAudioElement === audio &&
        GameEngine.isAudioInitialized
      ) {
        console.log("Reusing existing audio connection");
        if (!GameEngine.latency) {
          GameEngine.latency = await measureAudioLatency(
            GameEngine.audioContext!,
          );
        }
        return;
      }

      // 기존 연결 해제
      if (GameEngine.audioSource) {
        GameEngine.audioSource.disconnect();
      }
      if (GameEngine.analyser) {
        GameEngine.analyser.disconnect();
      }

      // 새로운 AudioContext 생성 및 연결
      if (
        !GameEngine.audioContext ||
        GameEngine.audioContext.state === "closed"
      ) {
        GameEngine.audioContext = new AudioContext();
      }

      try {
        GameEngine.analyser = GameEngine.audioContext.createAnalyser();
        GameEngine.audioSource =
          GameEngine.audioContext.createMediaElementSource(audio);

        GameEngine.audioSource.connect(GameEngine.analyser);
        GameEngine.analyser.connect(GameEngine.audioContext.destination);

        // 더 빠른 반응을 위한 설정 조정
        GameEngine.analyser.fftSize = 1024;
        GameEngine.analyser.smoothingTimeConstant = 0.1;
        GameEngine.analyser.minDecibels = -65;
        GameEngine.analyser.maxDecibels = -12;

        GameEngine.connectedAudioElement = audio;
        GameEngine.isAudioInitialized = true;

        // 레이턴시 측정
        GameEngine.latency = await measureAudioLatency(GameEngine.audioContext);
        console.log("Measured latency:", GameEngine.latency, "ms");
      } catch (error) {
        // 이미 연결된 경우 기존 연결 재사용
        if (
          error instanceof DOMException &&
          error.name === "InvalidStateError"
        ) {
          console.log("Audio element already connected, reusing connection");
          if (!GameEngine.latency) {
            GameEngine.latency = await measureAudioLatency(
              GameEngine.audioContext,
            );
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Failed to initialize audio base:", error);
    }
  }
}
