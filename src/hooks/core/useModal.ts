import { useState } from "react";

export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  return {
    isOpen,
    setIsOpen,
    open: () => setIsOpen(true),
  };
}
