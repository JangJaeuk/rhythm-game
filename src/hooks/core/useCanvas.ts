import { useEffect, useRef, useState } from "react";

interface CanvasSize {
  width: number;
  height: number;
}

interface UseCanvasProps {
  defaultWidth: number;
  defaultHeight: number;
  maxHeight?: number;
}

export function useCanvas({
  defaultWidth,
  defaultHeight,
  maxHeight = defaultHeight,
}: UseCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: defaultWidth,
    height: defaultHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const ORIGINAL_ASPECT_RATIO = defaultWidth / defaultHeight;

      const containerWidth = containerRef.current.clientWidth;
      const availableHeight = Math.min(
        containerRef.current.clientHeight,
        maxHeight
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
  }, [defaultWidth, defaultHeight, maxHeight]);

  return {
    containerRef,
    canvasSize,
  };
}
