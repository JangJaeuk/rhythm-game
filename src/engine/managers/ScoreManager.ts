import {
  COMBO_MULTIPLIERS,
  GOOD_SCORE,
  NORMAL_SCORE,
  PERFECT_SCORE,
} from "../constants/gameBase";

/**
 * 게임의 점수 시스템을 관리하는 매니저
 */
export class ScoreManager {
  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private perfectCount: number = 0;
  private goodCount: number = 0;
  private normalCount: number = 0;
  private missCount: number = 0;

  // 점수 관련 getter들
  public getScore = () => this.score;
  public getCombo = () => this.combo;
  public getMaxCombo = () => this.maxCombo;
  public getPerfectCount = () => this.perfectCount;
  public getGoodCount = () => this.goodCount;
  public getNormalCount = () => this.normalCount;
  public getMissCount = () => this.missCount;

  public reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.normalCount = 0;
    this.missCount = 0;
  }

  public registerPerfect() {
    const comboMultiplier = this.getComboMultiplier();
    this.score += PERFECT_SCORE * comboMultiplier;
    this.increaseCombo();
    this.perfectCount++;
  }

  public registerGood() {
    const comboMultiplier = this.getComboMultiplier();
    this.score += GOOD_SCORE * comboMultiplier;
    this.increaseCombo();
    this.goodCount++;
  }

  public registerNormal() {
    const comboMultiplier = this.getComboMultiplier();
    this.score += NORMAL_SCORE * comboMultiplier;
    this.increaseCombo();
    this.normalCount++;
  }

  public registerMiss() {
    this.combo = 0;
    this.missCount++;
  }

  private increaseCombo() {
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
  }

  public getComboMultiplier(): number {
    const { LEVEL_3, LEVEL_2, LEVEL_1, BASE } = COMBO_MULTIPLIERS;

    if (this.combo >= LEVEL_3.threshold) return LEVEL_3.multiplier;
    if (this.combo >= LEVEL_2.threshold) return LEVEL_2.multiplier;
    if (this.combo >= LEVEL_1.threshold) return LEVEL_1.multiplier;
    return BASE.multiplier;
  }
}
