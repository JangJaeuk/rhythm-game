import { LANE_COLORS, LANE_COUNT } from "../constants/gameBase";
import { LaneBackgroundEffect, LaneEffect } from "../types/effect";
import { AudioManager } from "./AudioManager";
import { GameScaleManager } from "./GameScaleManager";

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

interface ComboEffect {
  combo: number;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  color: string;
  timestamp: number;
}

interface JudgementEffect {
  text: string;
  color: string;
  timestamp: number;
}

/**
 * 게임의 시각적 효과(이펙트, 배경 등)를 관리하는 매니저
 */
export class EffectManager {
  private static readonly EFFECT_PARTICLE_POOL_SIZE = 200;
  private static readonly BACKGROUND_PARTICLE_POOL_SIZE = 50;
  private static readonly EFFECT_POOL_SIZE = 20;

  private effectParticlePool: EffectParticle[] = [];
  private backgroundParticlePool: BackgroundParticle[] = [];
  private effectPool: Effect[] = [];
  private particles: BackgroundParticle[] = [];

  private noteHitEffects: Effect[] = [];
  private comboEffects: ComboEffect[] = [];
  private currentJudgement: JudgementEffect | null = null;
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

  private readonly SMOOTHING_FACTOR = 0.3;
  private previousHeights: number[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private audioManager: AudioManager,
    private scaleManager: GameScaleManager
  ) {}

  // 레인 이펙트 관련 메서드
  public activateLaneEffect(lane: number, isLongNote: boolean = false) {
    this.laneEffects[lane] = {
      active: true,
      timestamp: isLongNote ? 0 : performance.now(),
    };
  }

  public deactivateLaneEffect(lane: number) {
    this.laneEffects[lane] = {
      active: false,
      timestamp: 0,
    };
  }

  public activateLaneBackgroundEffect(lane: number) {
    this.laneBackgroundEffects[lane] = {
      active: true,
    };
  }

  public deactivateLaneBackgroundEffect(lane: number) {
    this.laneBackgroundEffects[lane] = {
      active: false,
    };
  }

  // 노트 히트 이펙트 관련 메서드
  public createNoteHitEffect(
    lane: number,
    judgment: "PERFECT" | "GOOD" | "NORMAL" | "MISS"
  ) {
    // 판정 텍스트 효과 생성
    this.currentJudgement = {
      text: judgment,
      color:
        judgment === "PERFECT"
          ? "#ffd700"
          : judgment === "GOOD"
            ? "#00ff00"
            : judgment === "NORMAL"
              ? "#4488ff"
              : "#ff0000",
      timestamp: performance.now(),
    };

    // MISS는 파티클 이펙트를 생성하지 않음
    if (judgment === "MISS") {
      return;
    }

    const effect = this.getEffectFromPool();
    effect.x = (lane + 0.5) * this.scaleManager.scaledLaneWidth;
    effect.y = this.scaleManager.scaledJudgementLineY;
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

    // 파티클 생성
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

  // 콤보 이펙트 관련 메서드
  public createComboEffect(combo: number) {
    const existingEffect = this.comboEffects[0];
    const color = this.getComboColor(combo);

    if (existingEffect && performance.now() - existingEffect.timestamp < 200) {
      existingEffect.combo = combo;
      existingEffect.color = color;
      existingEffect.timestamp = performance.now();
      existingEffect.scale = 1.5;
      existingEffect.alpha = 1.0;
      return;
    }

    this.comboEffects = [];

    const x = this.canvas.width * 0.5;
    const y = this.canvas.height * 0.25;

    this.comboEffects.push({
      combo,
      x,
      y,
      scale: 1.5,
      alpha: 1.0,
      color,
      timestamp: performance.now(),
    });
  }

  // 배경 그리기
  public drawBackground() {
    this.drawReactiveBackground();
    this.drawVisualizer();
  }

  // 레인 이펙트 그리기
  public drawLaneEffects() {
    const scaledLaneWidth = this.scaleManager.scaledLaneWidth;
    const scaledJudgementLineY = this.scaleManager.scaledJudgementLineY;

    for (let i = 0; i < LANE_COUNT; i++) {
      // 레인 배경 효과
      if (this.laneBackgroundEffects[i].active) {
        const gradient = this.ctx.createLinearGradient(
          i * scaledLaneWidth,
          0,
          scaledLaneWidth,
          this.canvas.height
        );
        gradient.addColorStop(0, "#000");
        gradient.addColorStop(1, LANE_COLORS[i]);

        this.ctx.fillStyle = gradient;
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillRect(
          i * scaledLaneWidth,
          0,
          scaledLaneWidth,
          this.canvas.height
        );
      }

      // 판정선 효과
      const isActive = this.laneEffects[i].active;
      this.ctx.globalAlpha = 1;

      if (isActive) {
        this.ctx.strokeStyle = LANE_COLORS[i];
        this.ctx.lineWidth = this.scaleManager.scaleValue(10);
        this.ctx.shadowBlur = this.scaleManager.scaleValue(15);
        this.ctx.shadowColor = LANE_COLORS[i];
      } else {
        this.ctx.strokeStyle = LANE_COLORS[i];
        this.ctx.lineWidth = this.scaleManager.scaleValue(4);
        this.ctx.shadowBlur = 0;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(i * scaledLaneWidth, scaledJudgementLineY);
      this.ctx.lineTo((i + 1) * scaledLaneWidth, scaledJudgementLineY);
      this.ctx.stroke();
    }
  }

  // 히트 이펙트와 콤보 이펙트 그리기
  public drawHitEffects() {
    // 업데이트와 렌더링을 함께 수행
    this.updateComboEffects();
    this.drawComboEffects();
    this.updateNoteHitEffects();
    this.drawNoteHitEffects();
    this.drawJudgement();
  }

  public update(timestamp: number) {
    this.updateLaneEffects(timestamp);
    this.updateBackgroundParticles();
  }

  private drawJudgement() {
    if (
      this.currentJudgement &&
      performance.now() - this.currentJudgement.timestamp < 500
    ) {
      const elapsed = performance.now() - this.currentJudgement.timestamp;
      const alpha = 1 - elapsed / 1000;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = this.currentJudgement.color;
      this.ctx.font = `bold ${this.scaleManager.scaleFontSize(28)}px Arial`; // 36px에서 28px로 축소
      this.ctx.textAlign = "center";

      this.ctx.fillText(
        this.currentJudgement.text,
        this.canvas.width / 2,
        this.canvas.height - this.canvas.height / 4
      );

      this.ctx.restore();
    }
  }

  private drawNoteHitEffects() {
    this.noteHitEffects.forEach((effect) => {
      effect.particles.forEach((particle) => {
        if (particle.life <= 0.1) return;

        this.ctx.beginPath();
        this.ctx.arc(
          particle.x,
          particle.y,
          this.scaleManager.scaleValue(particle.size),
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

  private drawComboEffects() {
    if (this.comboEffects.length === 0) return;

    const effect = this.comboEffects[0];

    this.ctx.save();

    if (effect.alpha > 0.3) {
      this.ctx.shadowColor = effect.color;
      this.ctx.shadowBlur = this.scaleManager.scaleValue(8);
    }

    this.ctx.globalAlpha = effect.alpha;
    this.ctx.font = `bold ${this.scaleManager.scaleFontSize(32 * effect.scale)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    if (effect.alpha > 0.5) {
      this.ctx.strokeStyle = effect.color;
      this.ctx.lineWidth = this.scaleManager.scaleValue(2);
      this.ctx.strokeText(`${effect.combo} COMBO!`, effect.x, effect.y);
    }

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText(`${effect.combo} COMBO!`, effect.x, effect.y);

    this.ctx.restore();
  }

  private updateLaneEffects(timestamp: number) {
    this.laneEffects.forEach((effect, index) => {
      if (effect.active && effect.timestamp > 0) {
        if (timestamp - effect.timestamp > 100) {
          this.deactivateLaneEffect(index);
        }
      }
    });
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
        effect.particles.forEach((particle) =>
          this.returnEffectParticleToPool(particle)
        );
        this.returnEffectToPool(effect);
      }
    }

    this.noteHitEffects.length = writeIndex;
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

  private drawVisualizer() {
    if (!AudioManager.analyser || !this.audioManager.dataArray) return;

    try {
      AudioManager.analyser.getByteFrequencyData(this.audioManager.dataArray);

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const radius = 30;

      const barCount = 80;
      const angleStep = (Math.PI * 2) / barCount;

      const frequencyData = this.audioManager.processFrequencyData(
        this.audioManager.dataArray,
        barCount
      );

      if (this.previousHeights.length !== barCount) {
        this.previousHeights = new Array(barCount).fill(0);
      }

      this.ctx.save();

      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep;

        const targetHeight = this.normalizeHeight(frequencyData[i]);
        this.previousHeights[i] =
          this.previousHeights[i] * (1 - this.SMOOTHING_FACTOR) +
          targetHeight * this.SMOOTHING_FACTOR;

        const height = this.previousHeights[i];

        const gradient = this.ctx.createLinearGradient(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          centerX + Math.cos(angle) * (radius + height),
          centerY + Math.sin(angle) * (radius + height)
        );

        const hue = (i / barCount) * 360;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 80%, 0.2)`);

        const innerX = centerX + Math.cos(angle) * radius;
        const innerY = centerY + Math.sin(angle) * radius;
        const outerX = centerX + Math.cos(angle) * (radius + height);
        const outerY = centerY + Math.sin(angle) * (radius + height);

        this.ctx.beginPath();
        this.ctx.lineCap = "round";
        this.ctx.lineWidth = ((Math.PI * radius * 2) / barCount) * 0.7;
        this.ctx.strokeStyle = gradient;
        this.ctx.moveTo(innerX, innerY);
        this.ctx.lineTo(outerX, outerY);
        this.ctx.stroke();
      }

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
    const minHeight = 2;
    const maxHeight = 18;
    const heightRange = maxHeight - minHeight;

    const t = value / 255;
    const smoothValue = t * t * (3 - 2 * t);
    return minHeight + heightRange * smoothValue;
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

      const gradient = this.ctx.createLinearGradient(
        0,
        0,
        0,
        this.canvas.height
      );
      const hue = (Date.now() / 50) % 360;

      gradient.addColorStop(0, `hsla(${hue}, 70%, 5%, 1)`);
      gradient.addColorStop(
        0.5,
        `hsla(${hue + 30}, 70%, ${5 + intensity * 10}%, 1)`
      );
      gradient.addColorStop(1, `hsla(${hue + 60}, 70%, 5%, 1)`);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.drawBackgroundParticles();
    } catch (error) {
      console.error("Error in drawReactiveBackground:", error);
    }
  }

  private drawBackgroundParticles() {
    this.particles.forEach((particle) => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      this.ctx.fill();
    });
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
    if (
      this.effectParticlePool.length < EffectManager.EFFECT_PARTICLE_POOL_SIZE
    ) {
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
      EffectManager.BACKGROUND_PARTICLE_POOL_SIZE
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
    if (this.effectPool.length < EffectManager.EFFECT_POOL_SIZE) {
      effect.particles.length = 0; // 배열 재사용을 위해 비우기
      this.effectPool.push(effect);
    }
  }

  private getComboColor(combo: number): string {
    if (combo >= 100) return "#ff3366"; // 빨강 (100+)
    if (combo >= 50) return "#ffaa00"; // 주황 (50+)
    if (combo >= 30) return "#44aaff"; // 파랑 (30+)
    return "#88ff88"; // 초록
  }

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
  }
}
