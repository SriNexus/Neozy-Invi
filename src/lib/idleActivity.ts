/**
 * A single, shared "something just happened" clock for the whole
 * invitation's idle-scroll-cue system (see `useIdleScrollCue`).
 *
 * One set of passive, non-claiming window listeners — mounted once,
 * lazily, at module scope — rather than every scene wiring its own copy.
 * Deliberately separate from `useReelPager`'s own wheel/touch handling:
 * nothing here calls `preventDefault`, reads scroll position, or holds
 * any lock, so it can never affect the reel's gestures — it only ever
 * records "the guest just did something."
 */
let lastActivityAt = 0;
let listening = false;

function mark() {
  lastActivityAt = performance.now();
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  lastActivityAt = performance.now();
  const opts: AddEventListenerOptions = { passive: true };
  window.addEventListener("wheel", mark, opts);
  window.addEventListener("touchstart", mark, opts);
  window.addEventListener("touchmove", mark, opts);
  window.addEventListener("pointerdown", mark, opts);
  window.addEventListener("keydown", mark, opts);
  window.addEventListener("scroll", mark, opts);
}

/** Timestamp (performance.now()) of the most recent guest interaction. */
export function getLastActivity(): number {
  ensureListening();
  return lastActivityAt;
}

/** Explicit activity signal for interactions the shared listeners can't
 *  see cleanly (e.g. a sustained drag already claimed by another
 *  surface's own pointer handling). */
export function markActivity(): void {
  ensureListening();
  mark();
}
