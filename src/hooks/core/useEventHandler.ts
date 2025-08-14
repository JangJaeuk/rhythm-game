import { RefObject, useEffect } from "react";

interface KeyboardEventHandler {
  key: string;
  handler: () => void | Promise<void>;
}

interface MouseClickHandler {
  element: RefObject<HTMLElement>;
  handler: (x: number, y: number) => void;
}

interface UseEventHandlerProps {
  keyboardHandlers?: KeyboardEventHandler[];
  clickHandler?: MouseClickHandler;
}

export function useEventHandler({
  keyboardHandlers,
  clickHandler,
}: UseEventHandlerProps = {}) {
  // 키보드 이벤트 처리
  useEffect(() => {
    if (!keyboardHandlers?.length) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      const handler = keyboardHandlers.find((h) => h.key === e.key);
      if (handler) {
        await handler.handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardHandlers]);

  // 클릭 이벤트 처리
  useEffect(() => {
    if (!clickHandler) return;

    const handleClick = (e: MouseEvent) => {
      if (!clickHandler.element.current) return;

      const rect = clickHandler.element.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      clickHandler.handler(x, y);
    };

    const element = clickHandler.element.current;
    if (element) {
      element.addEventListener("click", handleClick);
      return () => element.removeEventListener("click", handleClick);
    }
  }, [clickHandler]);
}
