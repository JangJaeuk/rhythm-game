import { GameEngine } from "../GameEngine";

/**
 * 게임의 키보드 입력을 관리하는 매니저
 */
export class InputManager {
  private static readonly KEY_MAP: { [key: string]: number } = {
    KeyD: 0,
    KeyF: 1,
    KeyJ: 2,
    KeyK: 3,
  };

  private gameEngine: GameEngine;
  private onKeyPress: (lane: number) => void;
  private onKeyRelease: (lane: number) => void;

  constructor(
    gameEngine: GameEngine,
    onKeyPress: (lane: number) => void,
    onKeyRelease: (lane: number) => void
  ) {
    this.gameEngine = gameEngine;
    this.onKeyPress = onKeyPress;
    this.onKeyRelease = onKeyRelease;
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.gameEngine.isRunning || this.gameEngine.isGameOver) return;

    const lane = InputManager.KEY_MAP[e.code];
    if (lane !== undefined) {
      this.onKeyPress(lane);
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (!this.gameEngine.isRunning || this.gameEngine.isGameOver) return;

    const lane = InputManager.KEY_MAP[e.code];
    if (lane !== undefined) {
      this.onKeyRelease(lane);
    }
  }

  public destroy() {
    window.removeEventListener("keydown", this.handleKeyDown.bind(this));
    window.removeEventListener("keyup", this.handleKeyUp.bind(this));
  }
}
