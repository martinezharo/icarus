/** Small reusable Svelte actions for the UI's tactile interactions. */

/** Make a <textarea> grow with its content instead of scrolling. */
export function autogrow(node: HTMLTextAreaElement) {
  const resize = () => {
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  };
  node.addEventListener('input', resize);
  // Resize once mounted and after fonts settle.
  requestAnimationFrame(resize);
  return {
    update: resize,
    destroy() {
      node.removeEventListener('input', resize);
    },
  };
}

/**
 * Call `onOutside` when a pointer press lands outside `node` — used to dismiss
 * lightweight popovers (e.g. the month/year picker) without a full backdrop.
 */
export function clickOutside(node: HTMLElement, onOutside: () => void) {
  let handler = onOutside;
  const onPointerDown = (e: PointerEvent) => {
    if (!node.contains(e.target as Node)) handler();
  };
  // Defer binding so the same click that mounted the popover doesn't close it.
  requestAnimationFrame(() =>
    document.addEventListener('pointerdown', onPointerDown, true),
  );
  return {
    update(next: () => void) {
      handler = next;
    },
    destroy() {
      document.removeEventListener('pointerdown', onPointerDown, true);
    },
  };
}

interface VerticalDragParams {
  /** Fired when the gesture resolves past the threshold. */
  onResolve: (direction: 'up' | 'down') => void;
  threshold?: number;
}

/**
 * Pointer-driven vertical drag, used by the writing dock handle so it can be
 * dragged up to expand / down to collapse (in addition to a plain click).
 */
export function verticalDrag(node: HTMLElement, params: VerticalDragParams) {
  let startY = 0;
  let dragging = false;
  let p = params;

  const down = (e: PointerEvent) => {
    dragging = true;
    startY = e.clientY;
    node.setPointerCapture(e.pointerId);
  };
  const up = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const dy = e.clientY - startY;
    const threshold = p.threshold ?? 48;
    if (Math.abs(dy) >= threshold) p.onResolve(dy < 0 ? 'up' : 'down');
  };

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointerup', up);

  return {
    update(next: VerticalDragParams) {
      p = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointerup', up);
    },
  };
}
