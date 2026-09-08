/** Single source of truth for the reduced-motion query. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Coarse pointer (touch-primary) detection for interaction fallbacks. */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(any-pointer: fine)").matches;
}
