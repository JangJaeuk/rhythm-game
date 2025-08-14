import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../engine/constants/gameBase";
import { useCanvas } from "../core/useCanvas";

export function useGameCanvas() {
  return useCanvas({
    defaultWidth: CANVAS_WIDTH,
    defaultHeight: CANVAS_HEIGHT,
  });
}
