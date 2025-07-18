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

export const PERFECT_RANGE = 70;
export const GOOD_RANGE = 130;
export const NORMAL_RANGE = 250;
export const JUDGEMENT_RANGE = 400;

// 노트가 어느 정도 지나간 건 봐주기 위한 시간
export const TIME_CONSIDERING_PASSED = 30;
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

// 스피커 딜레이 오프셋 (내장 스피커 기준)
export const SPEAKER_DELAY_OFFSET = 533;
// 노트 타이밍 조정 비율
export const TIMING_RATIO = 4.255319;