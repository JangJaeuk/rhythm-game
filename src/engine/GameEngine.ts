import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FPS,
  GOOD_RANGE,
  INTERVAL_IN_LONG_NOTE_ACTIVE,
  JUDGEMENT_LINE_Y,
  JUDGEMENT_RANGE,
  LANE_COLORS,
  LANE_COUNT,
  LANE_WIDTH,
  NORMAL_RANGE,
  PASSED_LINE_Y,
  PERFECT_RANGE,
  SAFE_TIME_IN_LONG_NOTE_ACTIVE,
  TIME_CONSIDERING_PASSED,
} from "./constants/gameBase";
import { AudioManager } from "./managers/AudioManager";
import { InputManager } from "./managers/InputManager";
import { ScoreManager } from "./managers/ScoreManager";
import { LaneBackgroundEffect, LaneEffect } from "./types/effect";
import { Judgment } from "./types/judgment";
import { LongNoteState, Note, NoteType } from "./types/note";

// 타입 정의
interface EffectParticle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  life: number;
}

interface BackgroundParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface Effect {
  x: number;
  y: number;
  particles: EffectParticle[];
  timestamp: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private notes: Note[] = [];
  private activeNotes: Note[] = [];
  private startTime: number = 0;
  private lastTimestamp: number = 0;
  private currentJudgment: Judgment | null = null;
  private judgmentDisplayTime: number = 0;
  private lastLongNoteUpdate: { [key: number]: number } = {};
  private lastHitLane: number = 0;
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
  private previousHeights: number[] = [];
  private readonly SMOOTHING_FACTOR = 0.3;

  private audioManager: AudioManager;
  private inputManager: InputManager;
  private scoreManager: ScoreManager;

  isRunning: boolean = false;
  isGameOver: boolean = false;

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

  // 일시정지 버튼 영역
  private readonly PAUSE_BUTTON = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    margin: 20,
  };

  public getScoreInfo() {
    return {
      score: this.scoreManager.getScore(),
      combo: this.scoreManager.getCombo(),
      maxCombo: this.scoreManager.getMaxCombo(),
      perfectCount: this.scoreManager.getPerfectCount(),
      goodCount: this.scoreManager.getGoodCount(),
      normalCount: this.scoreManager.getNormalCount(),
      missCount: this.scoreManager.getMissCount(),
    };
  }

  // 일시정지 버튼 클릭 체크
  public isPauseButtonClicked(x: number, y: number): boolean {
    if (!this.isRunning) return false;

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

  constructor(
    canvas: HTMLCanvasElement,
    audio: HTMLAudioElement | null,
    onGameOver: () => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;

    this.audioManager = new AudioManager(audio, () => {
      this.isGameOver = true;
      onGameOver();
    });

    this.inputManager = new InputManager(
      this,
      this.handleKeyPress.bind(this),
      this.handleKeyRelease.bind(this)
    );

    this.scoreManager = new ScoreManager();
  }

  public setNotes(notes: Note[]) {
    const adjustedNotes = notes.map((note) => ({
      ...note,
      timing: note.timing + AudioManager.latency,
    }));

    this.notes = [...adjustedNotes].sort((a, b) => a.timing - b.timing);
  }

  public start() {
    this.isRunning = true;
    this.isGameOver = false;
    this.startTime = performance.now();
    this.lastTimestamp = this.startTime;
    this.audioManager.startAudio();

    requestAnimationFrame(this.update.bind(this));
  }

  // 게임 상태 초기화 시 모든 레인 이펙트도 초기화
  public stop() {
    this.isRunning = false;
    this.isGameOver = false;
    this.reset();

    // 모든 레인 이펙트 초기화
    for (let i = 0; i < LANE_COUNT; i++) {
      this.deactivateLaneBackgroundEffect(i);
      this.deactivateLaneEffect(i);
    }
  }

  public pause() {
    this.isRunning = false;

    // 모든 레인 이펙트 초기화
    for (let i = 0; i < LANE_COUNT; i++) {
      this.deactivateLaneBackgroundEffect(i);
      this.deactivateLaneEffect(i);
    }
  }

  public resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.update.bind(this));
    }
  }

  private reset() {
    this.notes = [];
    this.activeNotes = [];
    this.currentJudgment = null;

    this.scoreManager.reset();
  }

  private handleKeyPress(lane: number) {
    this.lastHitLane = lane;
    // 레인 백그라운드
    this.activateLaneBackgroundEffect(lane);

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
          // 현재 콤보 저장
          closestNote.startCombo = this.scoreManager.getCombo();
          // 액티브 효과 주기
          this.activateLaneEffect(lane, true);
          // 누른 상태로 변경
          closestNote.isHeld = true;
          closestNote.longNoteState = LongNoteState.HOLDING;

          // 시작 시점을 노트의 정확한 타이밍으로 설정
          this.lastLongNoteUpdate[closestNote.lane] = closestNote.timing;
        }
      }
    }
  }

  private handleKeyRelease(lane: number) {
    // 오디오 시간 기준으로 현재 시간 계산
    const currentTime = this.audioManager.getCurrentTime();

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
              this.registerPerfect();
            } else if (Math.abs(timeDiff) <= GOOD_RANGE) {
              this.registerGood();
            } else {
              this.registerNormal();
            }
          }
        }
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

  private noteHitEffects: Array<{
    x: number;
    y: number;
    particles: Array<{
      x: number;
      y: number;
      dx: number;
      dy: number;
      size: number;
      color: string;
      life: number;
    }>;
    timestamp: number;
  }> = [];

  // 객체 풀 추가
  private static readonly EFFECT_PARTICLE_POOL_SIZE = 200;
  private static readonly BACKGROUND_PARTICLE_POOL_SIZE = 50;
  private static readonly EFFECT_POOL_SIZE = 20;

  private effectParticlePool: EffectParticle[] = [];
  private backgroundParticlePool: BackgroundParticle[] = [];
  private effectPool: Effect[] = [];
  private particles: BackgroundParticle[] = [];

  private getEffectParticleFromPool(): EffectParticle {
    return (
      this.effectParticlePool.pop() || {
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        size: 0,
        color: "",
        life: 0,
      }
    );
  }

  private returnEffectParticleToPool(particle: EffectParticle) {
    if (this.effectParticlePool.length < GameEngine.EFFECT_PARTICLE_POOL_SIZE) {
      this.effectParticlePool.push(particle);
    }
  }

  private getBackgroundParticleFromPool(): BackgroundParticle {
    return (
      this.backgroundParticlePool.pop() || {
        x: 0,
        y: 0,
        size: 0,
        speed: 0,
        opacity: 0,
      }
    );
  }

  private returnBackgroundParticleToPool(particle: BackgroundParticle) {
    if (
      this.backgroundParticlePool.length <
      GameEngine.BACKGROUND_PARTICLE_POOL_SIZE
    ) {
      this.backgroundParticlePool.push(particle);
    }
  }

  private getEffectFromPool(): Effect {
    return (
      this.effectPool.pop() || {
        x: 0,
        y: 0,
        particles: [],
        timestamp: 0,
      }
    );
  }

  private returnEffectToPool(effect: Effect) {
    if (this.effectPool.length < GameEngine.EFFECT_POOL_SIZE) {
      effect.particles.length = 0; // 배열 재사용을 위해 비우기
      this.effectPool.push(effect);
    }
  }

  private createNoteHitEffect(
    lane: number,
    judgment: "PERFECT" | "GOOD" | "NORMAL" | null
  ) {
    const effect = this.getEffectFromPool();
    effect.x = (lane + 0.5) * this.scaledLaneWidth;
    effect.y = this.scaledJudgementLineY;
    effect.timestamp = performance.now();

    // 판정에 따른 파티클 설정
    const particleCount =
      judgment === "PERFECT" ? 20 : judgment === "GOOD" ? 15 : 10;
    const baseSize = judgment === "PERFECT" ? 4 : judgment === "GOOD" ? 3 : 2;
    const baseSpeed =
      judgment === "PERFECT" ? 15 : judgment === "GOOD" ? 12 : 8;
    const color =
      judgment === "PERFECT"
        ? LANE_COLORS[lane]
        : judgment === "GOOD"
          ? "#88ff88"
          : "#4488ff";

    // 파티클 생성 시 객체 풀 사용
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = baseSpeed * (0.8 + Math.random() * 0.4);

      const particle = this.getEffectParticleFromPool();
      particle.x = effect.x;
      particle.y = effect.y;
      particle.dx = Math.cos(angle) * speed;
      particle.dy = Math.sin(angle) * speed;
      particle.size = baseSize * (0.8 + Math.random() * 0.4);
      particle.color = color;
      particle.life = 1.0;

      effect.particles.push(particle);
    }

    this.noteHitEffects.push(effect);
  }

  private updateNoteHitEffects() {
    const now = performance.now();
    let writeIndex = 0;

    for (let i = 0; i < this.noteHitEffects.length; i++) {
      const effect = this.noteHitEffects[i];
      const age = now - effect.timestamp;

      if (age <= 2000) {
        let hasLiveParticle = false;
        let particleWriteIndex = 0;

        for (let j = 0; j < effect.particles.length; j++) {
          const particle = effect.particles[j];

          particle.x += particle.dx * 0.1;
          particle.y += particle.dy * 0.1;
          particle.dy += 0.2;
          particle.size *= 0.95;
          particle.dx *= 0.95;
          particle.dy *= 0.95;
          particle.life *= 0.95;

          if (particle.life > 0.1) {
            if (particleWriteIndex !== j) {
              effect.particles[particleWriteIndex] = particle;
            }
            particleWriteIndex++;
            hasLiveParticle = true;
          } else {
            this.returnEffectParticleToPool(particle);
          }
        }

        effect.particles.length = particleWriteIndex;

        if (hasLiveParticle) {
          if (writeIndex !== i) {
            this.noteHitEffects[writeIndex] = effect;
          }
          writeIndex++;
        } else {
          this.returnEffectToPool(effect);
        }
      } else {
        // 수명이 다한 이펙트의 모든 파티클을 풀에 반환
        effect.particles.forEach((particle) =>
          this.returnEffectParticleToPool(particle)
        );
        this.returnEffectToPool(effect);
      }
    }

    this.noteHitEffects.length = writeIndex;
  }

  private drawNoteHitEffects() {
    this.noteHitEffects.forEach((effect) => {
      effect.particles.forEach((particle) => {
        if (particle.life <= 0.1) return;

        this.ctx.beginPath();
        this.ctx.arc(
          particle.x,
          particle.y,
          particle.size * this.scale,
          0,
          Math.PI * 2
        );
        this.ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255)
          .toString(16)
          .padStart(2, "0")}`;
        this.ctx.fill();
      });
    });
  }

  private judgeNote(timeDiff: number) {
    let judgment: "PERFECT" | "GOOD" | "NORMAL" | null = null;

    if (timeDiff >= 0) {
      if (timeDiff <= PERFECT_RANGE) {
        this.registerPerfect();
        judgment = "PERFECT";
      } else if (timeDiff <= GOOD_RANGE) {
        this.registerGood();
        judgment = "GOOD";
      } else if (timeDiff <= NORMAL_RANGE) {
        this.registerNormal();
        judgment = "NORMAL";
      } else {
        this.registerMiss();
      }
    } else if (timeDiff < 0 && timeDiff + TIME_CONSIDERING_PASSED >= 0) {
      this.registerPerfect();
      judgment = "PERFECT";
    }

    // 판정에 따른 이펙트 생성
    if (judgment) {
      this.createNoteHitEffect(this.lastHitLane, judgment);
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

  private comboEffects: Array<{
    combo: number;
    x: number;
    y: number;
    scale: number;
    alpha: number;
    color: string;
    timestamp: number;
  }> = [];

  private getComboColor(combo: number): string {
    if (combo >= 100) return "#ff3366"; // 빨강 (100+)
    if (combo >= 50) return "#ffaa00"; // 주황 (50+)
    if (combo >= 30) return "#44aaff"; // 파랑 (30+)
    return "#88ff88"; // 초록
  }

  private createComboEffect() {
    // 이전 효과가 아직 활성 상태면 업데이트만 하고 새로 생성하지 않음
    const existingEffect = this.comboEffects[0];
    const currentCombo = this.scoreManager.getCombo();

    if (existingEffect && performance.now() - existingEffect.timestamp < 200) {
      existingEffect.combo = currentCombo;
      existingEffect.color = this.getComboColor(currentCombo);
      existingEffect.timestamp = performance.now();
      existingEffect.scale = 1.5;
      existingEffect.alpha = 1.0;
      return;
    }

    // 최대 1개의 효과만 유지
    this.comboEffects = [];

    const x = this.canvas.width * 0.5;
    const y = this.canvas.height * 0.25;

    this.comboEffects.push({
      combo: currentCombo,
      x,
      y,
      scale: 1.5,
      alpha: 1.0,
      color: this.getComboColor(currentCombo),
      timestamp: performance.now(),
    });
  }

  private updateComboEffects() {
    const now = performance.now();
    let writeIndex = 0;

    for (let i = 0; i < this.comboEffects.length; i++) {
      const effect = this.comboEffects[i];
      const age = now - effect.timestamp;

      if (age <= 400) {
        effect.scale = 1.5 - (age / 400) * 0.3;
        effect.alpha = Math.max(0, 1 - age / 400);

        if (effect.alpha > 0) {
          if (writeIndex !== i) {
            this.comboEffects[writeIndex] = effect;
          }
          writeIndex++;
        }
      }
    }

    this.comboEffects.length = writeIndex;
  }

  private drawComboEffects() {
    if (this.comboEffects.length === 0) return;

    const effect = this.comboEffects[0];
    this.ctx.save();

    // 그림자 효과 최적화
    if (effect.alpha > 0.3) {
      // 투명도가 낮을 때는 그림자 효과 생략
      this.ctx.shadowColor = effect.color;
      this.ctx.shadowBlur = 8 * this.scale; // 그림자 크기 축소
    }

    // 텍스트 설정
    this.ctx.globalAlpha = effect.alpha;
    this.ctx.font = `bold ${32 * effect.scale * this.scale}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // 외곽선 (투명도가 높을 때만)
    if (effect.alpha > 0.5) {
      this.ctx.strokeStyle = effect.color;
      this.ctx.lineWidth = 2 * this.scale;
      this.ctx.strokeText(`${effect.combo} COMBO!`, effect.x, effect.y);
    }

    // 메인 텍스트
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText(`${effect.combo} COMBO!`, effect.x, effect.y);

    this.ctx.restore();
  }

  private registerPerfect() {
    this.scoreManager.registerPerfect();

    this.createComboEffect();
    this.currentJudgment = { text: "PERFECT", color: "#ffd700" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerGood() {
    this.scoreManager.registerGood();

    this.createComboEffect();
    this.currentJudgment = { text: "GOOD", color: "#00ff00" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerNormal() {
    this.scoreManager.registerNormal();

    this.createComboEffect();
    this.currentJudgment = { text: "NORMAL", color: "#4488ff" };
    this.judgmentDisplayTime = performance.now();
  }

  private registerMiss() {
    this.scoreManager.registerMiss();

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

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = this.currentJudgment.color;
      this.ctx.font = `bold ${28 * this.scale}px Arial`; // 36px에서 28px로 축소
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
    if (!AudioManager.analyser || !this.audioManager.dataArray) return;

    try {
      AudioManager.analyser.getByteFrequencyData(this.audioManager.dataArray);

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const radius = 30; // 원 크기 감소

      const barCount = 80;
      const angleStep = (Math.PI * 2) / barCount;

      // 주파수 데이터를 로그 스케일로 재배치
      const frequencyData = this.audioManager.processFrequencyData(
        this.audioManager.dataArray,
        barCount
      );

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
          centerY + Math.sin(angle) * (radius + height)
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

  private normalizeHeight(value: number): number {
    const minHeight = 2; // 최소 높이 더 감소
    const maxHeight = 18; // 최대 높이 감소
    const heightRange = maxHeight - minHeight;

    // 더 부드러운 반응 곡선
    const t = value / 255;
    const smoothValue = t * t * (3 - 2 * t); // 부드러운 보간
    return minHeight + heightRange * smoothValue;
  }

  // 일시정지 버튼 그리기
  private drawPauseButton() {
    if (!this.isRunning) return;

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
      barHeight
    );

    // 오른쪽 바
    this.ctx.fillRect(
      x + width * scale - barMargin - barWidth,
      y + (height * scale - barHeight) / 2,
      barWidth,
      barHeight
    );
  }

  private drawReactiveBackground() {
    if (!AudioManager.analyser || !this.audioManager.dataArray) return;

    try {
      AudioManager.analyser.getByteFrequencyData(this.audioManager.dataArray);
      const intensity =
        this.audioManager.processFrequencyData(
          this.audioManager.dataArray,
          1
        )[0] / 255;

      // 배경 그라데이션
      const gradient = this.ctx.createLinearGradient(
        0,
        0,
        0,
        this.canvas.height
      );
      const hue = (Date.now() / 50) % 360; // 시간에 따라 색상 변화

      gradient.addColorStop(0, `hsla(${hue}, 70%, 5%, 1)`);
      gradient.addColorStop(
        0.5,
        `hsla(${hue + 30}, 70%, ${5 + intensity * 10}%, 1)`
      );
      gradient.addColorStop(1, `hsla(${hue + 60}, 70%, 5%, 1)`);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // 파티클 효과
      this.updateBackgroundParticles();
      this.drawBackgroundParticles();
    } catch (error) {
      console.error("Error in drawReactiveBackground:", error);
    }
  }

  private initializeParticles() {
    const particleCount = 50;
    this.particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = this.getBackgroundParticleFromPool();
      particle.x = Math.random() * this.canvas.width;
      particle.y = Math.random() * this.canvas.height;
      particle.size = Math.random() * 3 + 1;
      particle.speed = Math.random() * 0.5 + 0.2;
      particle.opacity = Math.random() * 0.5 + 0.3;
      this.particles.push(particle);
    }
  }

  private updateBackgroundParticles() {
    if (this.particles.length === 0) {
      this.initializeParticles();
      return;
    }

    const intensity =
      this.audioManager.processFrequencyData(
        this.audioManager.dataArray!,
        1
      )[0] / 255;
    let writeIndex = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.y -= particle.speed * (1 + intensity);

      if (particle.y < 0) {
        particle.y = this.canvas.height;
        particle.x = Math.random() * this.canvas.width;
      }

      if (writeIndex !== i) {
        this.particles[writeIndex] = particle;
      }
      writeIndex++;
    }

    this.particles.length = writeIndex;
  }

  private drawBackgroundParticles() {
    this.particles.forEach((particle) => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      this.ctx.fill();
    });
  }

  // 기존 draw 함수 수정
  private draw() {
    const ctx = this.ctx;
    const scale = this.scale;
    const scaledLaneWidth = this.scaledLaneWidth;
    const scaledJudgementLineY = this.scaledJudgementLineY;
    const currentTime = this.audioManager.getCurrentTime();

    // 전체 상태 한 번만 저장
    ctx.save();

    // 캔버스 초기화
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 배경 효과 그리기
    this.drawReactiveBackground();

    // 레인 그리기 - 상태 변경 최소화
    ctx.beginPath();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;

    // 레인 경계선 한 번에 그리기
    for (let i = 1; i < LANE_COUNT; i++) {
      const x = i * scaledLaneWidth;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
    }
    ctx.stroke();

    // 레인 효과 그리기 - 상태 그룹화
    for (let i = 0; i < LANE_COUNT; i++) {
      // 레인 배경 효과
      if (this.laneBackgroundEffects[i].active) {
        const gradient = ctx.createLinearGradient(
          i * scaledLaneWidth,
          0,
          scaledLaneWidth,
          this.canvas.height
        );
        gradient.addColorStop(0, "#000");
        gradient.addColorStop(1, LANE_COLORS[i]);

        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(
          i * scaledLaneWidth,
          0,
          scaledLaneWidth,
          this.canvas.height
        );
      }
    }

    // 판정선 효과 - 상태 그룹화
    ctx.globalAlpha = 1;
    for (let i = 0; i < LANE_COUNT; i++) {
      const isActive = this.laneEffects[i].active;

      // 동일한 상태끼리 그룹화
      if (isActive) {
        ctx.strokeStyle = LANE_COLORS[i];
        ctx.lineWidth = 10 * scale;
        ctx.shadowBlur = 15 * scale;
        ctx.shadowColor = LANE_COLORS[i];
      } else {
        ctx.strokeStyle = LANE_COLORS[i];
        ctx.lineWidth = 4 * scale;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.moveTo(i * scaledLaneWidth, scaledJudgementLineY);
      ctx.lineTo((i + 1) * scaledLaneWidth, scaledJudgementLineY);
      ctx.stroke();
    }

    // 노트 그리기 - 상태 그룹화
    ctx.shadowBlur = 0;
    for (const note of this.activeNotes) {
      const y =
        scaledJudgementLineY -
        ((note.timing - currentTime) / 2) *
          (this.canvas.height / CANVAS_HEIGHT);

      ctx.fillStyle = LANE_COLORS[note.lane];

      if (note.type === NoteType.SHORT) {
        const noteHeight = 40 * scale;
        ctx.fillRect(
          note.lane * scaledLaneWidth,
          y - noteHeight / 2,
          scaledLaneWidth,
          noteHeight
        );
      } else {
        const duration = note.duration || 0;
        const height = (duration / 2) * (this.canvas.height / CANVAS_HEIGHT);

        // 롱노트 상태에 따른 투명도 설정
        ctx.globalAlpha =
          note.longNoteState === LongNoteState.HOLDING
            ? 1
            : note.longNoteState === LongNoteState.MISSED
              ? 0.3
              : 0.8;

        ctx.fillRect(
          note.lane * scaledLaneWidth,
          y - height,
          scaledLaneWidth,
          height
        );
      }
    }

    // UI 요소 그리기 - 공통 상태 설정
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    ctx.font = `${24 * scale}px Arial`;
    ctx.fillStyle = "#ffffff";

    // 점수 및 콤보 표시
    ctx.fillText(
      `Score: ${this.scoreManager.getScore()}`,
      10 * scale,
      30 * scale
    );
    ctx.fillText(
      `Combo: ${this.scoreManager.getCombo()}`,
      10 * scale,
      60 * scale
    );
    ctx.fillText(
      `Bonus: x${this.scoreManager.getComboMultiplier()}`,
      10 * scale,
      90 * scale
    );

    // 비주얼라이저 그리기
    if (this.isRunning) {
      this.drawVisualizer();
    }

    // 판정 표시
    if (
      this.currentJudgment &&
      performance.now() - this.judgmentDisplayTime < 500
    ) {
      this.drawJudgment();
    }

    // 이펙트 그리기
    this.updateComboEffects();
    this.drawComboEffects();

    // 노트 히트 이펙트
    this.updateNoteHitEffects();
    this.drawNoteHitEffects();

    // 일시정지 버튼
    this.drawPauseButton();

    // 마지막에 한 번만 복원
    ctx.restore();
  }

  private update(timestamp: number) {
    if (!this.isRunning && !this.isGameOver) return;

    const frameInterval = 1000 / FPS;
    const deltaTime = timestamp - this.lastTimestamp;

    if (deltaTime < frameInterval) {
      requestAnimationFrame(this.update.bind(this));
      return;
    }

    this.lastTimestamp = timestamp;

    // 게임 오버가 아닐 때만 게임 로직 실행
    // 오디오 시간 기준으로 게임 시간 계산
    if (!this.isGameOver) {
      const currentTime = this.audioManager.getCurrentTime();

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
    }

    this.draw();
    requestAnimationFrame(this.update.bind(this));
  }

  // 클린업 처리 개선
  public destroy() {
    // 모든 파티클과 이펙트를 풀에 반환
    this.noteHitEffects.forEach((effect) => {
      effect.particles.forEach((particle) =>
        this.returnEffectParticleToPool(particle)
      );
      this.returnEffectToPool(effect);
    });

    this.particles.forEach((particle) =>
      this.returnBackgroundParticleToPool(particle)
    );

    // 배열 비우기
    this.noteHitEffects.length = 0;
    this.particles.length = 0;
    this.comboEffects.length = 0;

    // 객체 풀 초기화
    this.effectParticlePool = [];
    this.backgroundParticlePool = [];
    this.effectPool = [];

    this.inputManager.destroy();
  }
}
