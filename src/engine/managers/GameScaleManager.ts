import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  JUDGEMENT_LINE_Y,
  LANE_WIDTH,
  PASSED_LINE_Y,
} from "../constants/gameBase";

/**
 * 게임의 모든 스케일 관련 계산을 중앙화하여 관리하는 매니저
 */
export class GameScaleManager {
  constructor(private canvas: HTMLCanvasElement) {}

  get widthScale() {
    return this.canvas.width / CANVAS_WIDTH;
  }

  get heightScale() {
    return this.canvas.height / CANVAS_HEIGHT;
  }

  get scaledLaneWidth() {
    return LANE_WIDTH * this.widthScale;
  }

  get scaledJudgementLineY() {
    return JUDGEMENT_LINE_Y * this.heightScale;
  }

  get scaledPassedLineY() {
    return PASSED_LINE_Y * this.heightScale;
  }

  get scaledNoteHeight() {
    return 40 * this.widthScale;
  }

  scaleFontSize(size: number) {
    return size * this.widthScale;
  }

  scaleValue(value: number, direction: "width" | "height" = "width") {
    return value * (direction === "width" ? this.widthScale : this.heightScale);
  }

  calculateNoteY(timing: number, currentTime: number) {
    return (
      this.scaledJudgementLineY -
      ((timing - currentTime) / 2) * this.heightScale
    );
  }

  calculateLongNoteHeight(duration: number) {
    return (duration / 2) * this.heightScale;
  }
}
