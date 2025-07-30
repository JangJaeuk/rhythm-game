export const LANE_COLORS = [
  "#ff4757", // Red
  "#2ed573", // Green
  "#1e90ff", // Blue
  "#ffa502", // Orange
];

export const LANE_COUNT = 4;
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 800;

export const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
export const JUDGEMENT_LINE_Y = 800;

export const PERFECT_SCORE = 1000;
export const GOOD_SCORE = 600;
export const NORMAL_SCORE = 300;

export const COMBO_MULTIPLIERS = {
  LEVEL_3: { threshold: 60, multiplier: 1.5 },
  LEVEL_2: { threshold: 40, multiplier: 1.3 },
  LEVEL_1: { threshold: 20, multiplier: 1.2 },
  BASE: { threshold: 0, multiplier: 1.0 },
} as const;

export const PERFECT_RANGE = 60;
export const GOOD_RANGE = 120;
export const NORMAL_RANGE = 240;
export const JUDGEMENT_RANGE = 400;

// 노트가 어느 정도 지나간 건 봐주기 위한 시간
export const TIME_CONSIDERING_PASSED = 35;
// 긴 노트 누르는 동안 증가하는 콤보 인터벌
export const INTERVAL_IN_LONG_NOTE_ACTIVE = 100;
// 긴 노트 누르는 동안 인터벌 증가할때 생기는 딜레이 고려한 안전 시간?
export const SAFE_TIME_IN_LONG_NOTE_ACTIVE = 50;
// 노트와 매칭되는 키를 누르지 않아 MISS를 띄울 때 기준이 되는 선
export const PASSED_LINE_Y = 50;
// FPS
export const FPS = 70;
// 노트 생성 딜레이
export const NOTE_DELAY = 100;
