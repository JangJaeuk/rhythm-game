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

  /**
   * 가로 방향 스케일 (canvas.width / CANVAS_WIDTH)
   */
  get widthScale() {
    return this.canvas.width / CANVAS_WIDTH;
  }

  /**
   * 세로 방향 스케일 (canvas.height / CANVAS_HEIGHT)
   */
  get heightScale() {
    return this.canvas.height / CANVAS_HEIGHT;
  }

  /**
   * 레인 너비 계산
   */
  get scaledLaneWidth() {
    return LANE_WIDTH * this.widthScale;
  }

  /**
   * 판정선 Y좌표 계산
   */
  get scaledJudgementLineY() {
    return JUDGEMENT_LINE_Y * this.heightScale;
  }

  /**
   * 노트 통과선 Y좌표 계산
   */
  get scaledPassedLineY() {
    return PASSED_LINE_Y * this.heightScale;
  }

  /**
   * 숏노트 높이 계산
   */
  get scaledNoteHeight() {
    return 40 * this.widthScale; // SHORT_NOTE_HEIGHT = 40
  }

  /**
   * 폰트 크기 계산
   * @param size 기본 폰트 크기
   */
  scaleFontSize(size: number) {
    return size * this.widthScale;
  }

  /**
   * UI 요소 위치/크기 계산
   * @param value 기본 값
   * @param direction 스케일 방향 ('width' | 'height')
   */
  scaleValue(value: number, direction: "width" | "height" = "width") {
    return value * (direction === "width" ? this.widthScale : this.heightScale);
  }

  /**
   * 노트 Y좌표 계산
   * @param timing 노트 타이밍
   * @param currentTime 현재 시간
   */
  calculateNoteY(timing: number, currentTime: number) {
    return (
      this.scaledJudgementLineY -
      ((timing - currentTime) / 2) * this.heightScale
    );
  }

  /**
   * 롱노트 높이 계산
   * @param duration 노트 지속 시간
   */
  calculateLongNoteHeight(duration: number) {
    return (duration / 2) * this.heightScale;
  }
}
