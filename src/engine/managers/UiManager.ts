import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  JUDGEMENT_LINE_Y,
  LANE_COLORS,
  LANE_COUNT,
  LANE_WIDTH,
} from "../constants/gameBase";
import { LongNoteState, Note, NoteType } from "../types/note";
import { ScoreManager } from "./ScoreManager";

export class UiManager {
  // 일시정지 버튼 영역
  private readonly PAUSE_BUTTON = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    margin: 20,
  };

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private scoreManager: ScoreManager
  ) {}

  // 캔버스 크기에 따른 스케일 계산
  private get scale() {
    return this.canvas.width / CANVAS_WIDTH;
  }

  // 일시정지 버튼 클릭 체크
  public isPauseButtonClicked(
    x: number,
    y: number,
    isRunning: boolean
  ): boolean {
    if (!isRunning) return false;

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

  // 노트 그리기
  public drawNotes(notes: Note[], currentTime: number) {
    // 상태 설정
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    // 모든 노트 그리기
    for (const note of notes) {
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
          noteHeight
        );
      } else {
        const duration = note.duration || 0;
        const height = (duration / 2) * (this.canvas.height / CANVAS_HEIGHT);

        // 롱노트 상태에 따른 투명도 설정
        this.ctx.globalAlpha =
          note.longNoteState === LongNoteState.HOLDING
            ? 1
            : note.longNoteState === LongNoteState.MISSED
              ? 0.3
              : 0.8;

        this.ctx.fillRect(
          note.lane * this.scaledLaneWidth,
          y - height,
          this.scaledLaneWidth,
          height
        );
      }
      this.ctx.globalAlpha = 1;
    }
  }

  // 실제 레인 너비 계산
  private get scaledLaneWidth() {
    return LANE_WIDTH * (this.canvas.width / CANVAS_WIDTH);
  }

  // 실제 판정선 Y 좌표 계산
  private get scaledJudgementLineY() {
    return JUDGEMENT_LINE_Y * (this.canvas.height / CANVAS_HEIGHT);
  }
  // 레인 경계선 그리기
  public drawLaneLines() {
    const scaledLaneWidth = this.canvas.width / LANE_COUNT;

    this.ctx.beginPath();
    this.ctx.globalAlpha = 0.2;
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1;

    // 레인 경계선 한 번에 그리기
    for (let i = 1; i < LANE_COUNT; i++) {
      const x = i * scaledLaneWidth;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    this.ctx.stroke();
  }

  // 점수 표시
  public drawScore() {
    const scale = this.scale;

    // UI 요소 그리기 - 공통 상태 설정
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
    this.ctx.textAlign = "left";
    this.ctx.font = `${24 * scale}px Arial`;
    this.ctx.fillStyle = "#ffffff";

    // 점수 및 콤보 표시
    this.ctx.fillText(
      `Score: ${this.scoreManager.getScore()}`,
      10 * scale,
      30 * scale
    );
    this.ctx.fillText(
      `Combo: ${this.scoreManager.getCombo()}`,
      10 * scale,
      60 * scale
    );
    this.ctx.fillText(
      `Bonus: x${this.scoreManager.getComboMultiplier()}`,
      10 * scale,
      90 * scale
    );

    // 일시정지 버튼
    this.drawPauseButton();
  }

  // 일시정지 버튼 그리기
  private drawPauseButton(isRunning: boolean = true) {
    if (!isRunning) return;

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
}
