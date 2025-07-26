import { useEffect, useRef, useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../engine/constants/gameBase";

export function useGameCanvasSize() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  });

  // 캔버스 크기 조정
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const MAX_HEIGHT = CANVAS_HEIGHT;
      const ORIGINAL_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

      const containerWidth = containerRef.current.clientWidth;
      const availableHeight = Math.min(
        containerRef.current.clientHeight,
        MAX_HEIGHT
      );

      // 너비 기준으로 계산했을 때의 크기
      const widthBasedSize = {
        width: containerWidth,
        height: containerWidth / ORIGINAL_ASPECT_RATIO,
      };

      // 높이 기준으로 계산했을 때의 크기
      const heightBasedSize = {
        width: availableHeight * ORIGINAL_ASPECT_RATIO,
        height: availableHeight,
      };

      // 둘 중 더 작은 크기를 선택 (컨테이너를 벗어나지 않는 크기)
      const finalSize =
        widthBasedSize.height <= availableHeight
          ? widthBasedSize
          : heightBasedSize;

      setCanvasSize(finalSize);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    containerRef,
    canvasSize,
    setCanvasSize,
  };
}
