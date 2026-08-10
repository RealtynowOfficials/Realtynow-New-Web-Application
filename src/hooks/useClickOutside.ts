import { useEffect, type RefObject } from 'react';

// Shared "close this open dropdown/menu" behavior — closes on a genuine
// outside pointer-down and on Escape. Centralized so every dropdown in the
// app gets the same, correct behavior instead of each one reinventing (or
// forgetting) its own document listener.
//
// Uses `mousedown` rather than `click` deliberately: closing on the click
// event that *opened* the menu would race with the opening handler within
// the same interaction. `mousedown` fires and resolves before the
// subsequent `click`, so it can't undo a click that hasn't happened yet.
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClose: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, onClose, active]);
}
