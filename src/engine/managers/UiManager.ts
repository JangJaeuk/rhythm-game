import { LANE_COLORS, LANE_COUNT } from "../constants/gameBase";
import { LongNoteState, Note, NoteType } from "../types/note";
import { GameScaleManager } from "./GameScaleManager";
import { ScoreManager } from "./ScoreManager";

/**
 * 게임의 UI 요소(점수, 노트, 레인, 버튼)를 관리하는 매니저
 */
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
    private scoreManager: ScoreManager,
    private scaleManager: GameScaleManager
  ) {}

  // 일시정지 버튼 클릭 체크
  public isPauseButtonClicked(
    x: number,
    y: number,
    isRunning: boolean
  ): boolean {
    if (!isRunning) return false;

    const buttonX =
      this.canvas.width -
      this.scaleManager.scaleValue(
        this.PAUSE_BUTTON.width + this.PAUSE_BUTTON.margin
      );
    const buttonY = this.scaleManager.scaleValue(this.PAUSE_BUTTON.margin);
    const buttonWidth = this.scaleManager.scaleValue(this.PAUSE_BUTTON.width);
    const buttonHeight = this.scaleManager.scaleValue(this.PAUSE_BUTTON.height);

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
      const y = this.scaleManager.calculateNoteY(note.timing, currentTime);
      this.ctx.fillStyle = LANE_COLORS[note.lane];

      if (note.type === NoteType.SHORT) {
        const noteHeight = this.scaleManager.scaledNoteHeight;
        this.ctx.fillRect(
          note.lane * this.scaleManager.scaledLaneWidth,
          y - noteHeight / 2,
          this.scaleManager.scaledLaneWidth,
          noteHeight
        );
      } else {
        const duration = note.duration || 0;
        const height = this.scaleManager.calculateLongNoteHeight(duration);

        // 롱노트 상태에 따른 투명도 설정
        this.ctx.globalAlpha =
          note.longNoteState === LongNoteState.HOLDING
            ? 1
            : note.longNoteState === LongNoteState.MISSED
              ? 0.3
              : 0.8;

        this.ctx.fillRect(
          note.lane * this.scaleManager.scaledLaneWidth,
          y - height,
          this.scaleManager.scaledLaneWidth,
          height
        );
      }
      this.ctx.globalAlpha = 1;
    }
  }

  // 레인 경계선 그리기
  public drawLaneLines() {
    const scaledLaneWidth = this.scaleManager.scaledLaneWidth;

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
    // UI 요소 그리기 - 공통 상태 설정
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
    this.ctx.textAlign = "left";
    this.ctx.font = `${this.scaleManager.scaleFontSize(24)}px Arial`;
    this.ctx.fillStyle = "#ffffff";

    // 점수 및 콤보 표시
    this.ctx.fillText(
      `Score: ${this.scoreManager.getScore()}`,
      this.scaleManager.scaleValue(10),
      this.scaleManager.scaleValue(30)
    );
    this.ctx.fillText(
      `Combo: ${this.scoreManager.getCombo()}`,
      this.scaleManager.scaleValue(10),
      this.scaleManager.scaleValue(60)
    );
    this.ctx.fillText(
      `Bonus: x${this.scoreManager.getComboMultiplier()}`,
      this.scaleManager.scaleValue(10),
      this.scaleManager.scaleValue(90)
    );

    // 일시정지 버튼
    this.drawPauseButton();
  }

  // 일시정지 버튼 그리기
  private drawPauseButton(isRunning: boolean = true) {
    if (!isRunning) return;

    const { width, height, margin } = this.PAUSE_BUTTON;

    // 버튼 위치 계산
    const x = this.canvas.width - this.scaleManager.scaleValue(width + margin);
    const y = this.scaleManager.scaleValue(margin);
    const buttonWidth = this.scaleManager.scaleValue(width);
    const buttonHeight = this.scaleManager.scaleValue(height);

    // 반투명 배경
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.beginPath();
    this.ctx.roundRect(
      x,
      y,
      buttonWidth,
      buttonHeight,
      this.scaleManager.scaleValue(8)
    );
    this.ctx.fill();

    // 일시정지 아이콘
    this.ctx.fillStyle = "#ffffff";
    const barWidth = this.scaleManager.scaleValue(4);
    const barHeight = this.scaleManager.scaleValue(16);
    const barMargin = this.scaleManager.scaleValue(12);

    // 왼쪽 바
    this.ctx.fillRect(
      x + barMargin,
      y + (buttonHeight - barHeight) / 2,
      barWidth,
      barHeight
    );

    // 오른쪽 바
    this.ctx.fillRect(
      x + buttonWidth - barMargin - barWidth,
      y + (buttonHeight - barHeight) / 2,
      barWidth,
      barHeight
    );
  }
}
