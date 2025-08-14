import { RefObject, useEffect, useRef } from "react";

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
  // 이전 핸들러 참조 저장
  const handlersRef = useRef(keyboardHandlers);
  const clickHandlerRef = useRef(clickHandler);

  // 참조 업데이트
  useEffect(() => {
    handlersRef.current = keyboardHandlers;
    clickHandlerRef.current = clickHandler;
  });

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const handlers = handlersRef.current;
      if (!handlers?.length) return;

      const handler = handlers.find((h) => h.key === e.key);
      if (handler) {
        await handler.handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 클릭 이벤트 처리
  useEffect(() => {
    const handler = clickHandlerRef.current;
    if (!handler?.element.current) return;

    const handleClick = (e: MouseEvent) => {
      const currentHandler = clickHandlerRef.current;
      if (!currentHandler?.element.current) return;

      const rect = currentHandler.element.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      currentHandler.handler(x, y);
    };

    handler.element.current.addEventListener("click", handleClick);
    return () =>
      handler.element.current?.removeEventListener("click", handleClick);
  }, []);
}
