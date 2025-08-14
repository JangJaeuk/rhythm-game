import { FPS, LANE_COUNT } from "./constants/gameBase";
import { AudioManager } from "./managers/AudioManager";
import { EffectManager } from "./managers/EffectManager";
import { GameScaleManager } from "./managers/GameScaleManager";
import { InputManager } from "./managers/InputManager";
import { NoteManager } from "./managers/NoteManager";
import { ScoreManager } from "./managers/ScoreManager";
import { UiManager } from "./managers/UiManager";
import { Note, NoteType } from "./types/note";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private startTime: number = 0;
  private lastTimestamp: number = 0;
  private audioManager: AudioManager;
  private inputManager: InputManager;
  private scoreManager: ScoreManager;
  private noteManager: NoteManager;
  private effectManager: EffectManager;
  private uiManager: UiManager;
  private scaleManager: GameScaleManager;

  isRunning: boolean = false;
  isGameOver: boolean = false;

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

    this.scoreManager = new ScoreManager();

    this.scaleManager = new GameScaleManager(canvas);

    this.noteManager = new NoteManager(
      this.audioManager,
      this.scoreManager,
      this.scaleManager,
      this.handleNoteJudgement.bind(this)
    );

    this.effectManager = new EffectManager(
      canvas,
      ctx,
      this.audioManager,
      this.scaleManager
    );

    this.uiManager = new UiManager(
      canvas,
      ctx,
      this.scoreManager,
      this.scaleManager
    );

    this.inputManager = new InputManager(
      this,
      this.handleKeyPress.bind(this),
      this.handleKeyRelease.bind(this)
    );
  }

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
    return this.uiManager.isPauseButtonClicked(x, y, this.isRunning);
  }

  public setNotes(notes: Note[]) {
    this.noteManager.setNotes(notes);
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
      this.effectManager.deactivateLaneBackgroundEffect(i);
      this.effectManager.deactivateLaneEffect(i);
    }
  }

  public pause() {
    this.isRunning = false;

    // 모든 레인 이펙트 초기화
    for (let i = 0; i < LANE_COUNT; i++) {
      this.effectManager.deactivateLaneBackgroundEffect(i);
      this.effectManager.deactivateLaneEffect(i);
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
    this.scoreManager.reset();
    this.noteManager.reset();
  }

  private handleKeyPress(lane: number) {
    this.effectManager.activateLaneBackgroundEffect(lane);
    const closestNote = this.noteManager.handleKeyPress(lane);

    // 판정이 노멀 이상이면서 숏노트거나, 롱노트의 시작점일 때 레인 이펙트 활성화
    if (
      closestNote &&
      (closestNote.type === NoteType.SHORT ||
        (closestNote.type === NoteType.LONG && !closestNote.isHeld))
    ) {
      this.effectManager.activateLaneEffect(
        lane,
        closestNote.type === NoteType.LONG
      );
    }
  }

  private handleKeyRelease(lane: number) {
    this.effectManager.deactivateLaneBackgroundEffect(lane);
    this.effectManager.deactivateLaneEffect(lane);
    this.noteManager.handleKeyRelease(lane);
  }

  private handleNoteJudgement(judgement: {
    type: "PERFECT" | "GOOD" | "NORMAL" | "MISS";
    lane: number;
  }) {
    // 모든 판정에 대해 판정 텍스트 표시
    this.effectManager.createNoteHitEffect(judgement.lane, judgement.type);

    // MISS가 아닐 때만 콤보 이펙트와 레인 이펙트 생성
    if (judgement.type !== "MISS") {
      this.effectManager.createComboEffect(this.scoreManager.getCombo());
      if (judgement.type !== "NORMAL") {
        this.effectManager.activateLaneEffect(judgement.lane);
      }
    }
  }

  // 기존 draw 함수 수정
  private draw() {
    const ctx = this.ctx;
    const currentTime = this.audioManager.getCurrentTime();

    // 캔버스 초기화
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 전체 상태 한 번만 저장
    ctx.save();

    // 배경 및 레인 이펙트 그리기
    this.effectManager.drawBackground();
    this.effectManager.drawLaneEffects();

    // 레인 경계선 그리기
    this.uiManager.drawLaneLines();

    // 노트 그리기
    this.uiManager.drawNotes(this.noteManager.getActiveNotes(), currentTime);

    // 노트 히트 이펙트와 콤보 이펙트 그리기
    this.effectManager.drawHitEffects();

    // 점수/콤보/보너스 UI 그리기
    this.uiManager.drawScore();

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

    const currentTime = this.audioManager.getCurrentTime();

    // 이펙트 매니저는 게임 오버 상태에서도 업데이트 (배경 효과 유지)
    this.effectManager.update(timestamp);

    // 게임 오버가 아닐 때만 게임 로직 실행
    if (!this.isGameOver) {
      this.noteManager.updateLongNotes(currentTime);
      this.noteManager.updateNotes(currentTime);
    }

    this.draw();
    requestAnimationFrame(this.update.bind(this));
  }

  // 클린업 처리 개선
  public destroy() {
    this.effectManager.destroy();
    this.inputManager.destroy();
  }
}
