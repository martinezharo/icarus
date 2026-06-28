/** Small reusable Svelte actions for the UI's tactile interactions. */

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

/**
 * Keep keyboard focus inside `node` while it's mounted — for popovers/dialogs
 * that should behave like proper dialogs: Tab cycles within, Escape closes (via
 * the supplied callback), and focus moves to the first control on open and
 * returns to the previously-focused element on close.
 */
export function trapFocus(node: HTMLElement, onClose?: () => void) {
  let close = onClose;
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const focusable = (): HTMLElement[] =>
    Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Stop the global Escape handler from also acting on this keypress.
      e.stopPropagation();
      close?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  node.addEventListener('keydown', onKeydown);
  // Focus the first control once the popover has mounted.
  requestAnimationFrame(() => focusable()[0]?.focus());

  return {
    update(next: () => void) {
      close = next;
    },
    destroy() {
      node.removeEventListener('keydown', onKeydown);
      // Restore focus to whatever opened the popover, if it's still around.
      previouslyFocused?.focus?.();
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
