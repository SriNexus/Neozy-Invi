import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * useReelPager — ONE coherent full-screen scene navigator for the
 * invitation's cinematic reel.
 *
 * Every full-screen scene in the guest journey (Couple, Date, the
 * Celebrations chapter page, every ceremony, the Couple Photo album)
 * is marked with `data-reel-scene`. Scenes sit in normal document
 * flow, each one viewport tall, each carrying its OWN background so
 * background + foreground move together. This hook is the single piece
 * of input logic that turns that flow into a vertical reels-style
 * experience:
 *
 *   · one gesture = one scene (never Event 1 → Event 3 by accident)
 *   · a transition lock holds while the scene glides, so gestures can
 *     not double-fire or stack mid-move
 *   · small accidental touch movement stays below a threshold
 *   · a rest is ALWAYS a complete scene — never a stable half-and-half
 *   · the first scene cannot scroll above the invitation; past the
 *     last scene (the album) normal page scrolling resumes, and
 *     scrolling back up re-enters the reel cleanly
 *
 * The mechanism is deliberately low-level and single-owner:
 *
 *   WHEEL — a claimed wheel event pages exactly one scene (it calls
 *   preventDefault so the native scroll burst can never run through
 *   several scenes). Gestures that would leave the reel are NOT
 *   claimed and the browser scrolls normally.
 *
 *   TOUCH — vertical intent (|dy| clearly > |dx|, past a small slop)
 *   is claimed; from that moment the page follows the finger 1:1.
 *   On release the gesture settles to the scene it earned: a decisive
 *   fling moves one scene, a sustained drag moves as many scene tops
 *   as it actually crossed, a short nudge settles back. Horizontal
 *   intent is never claimed — it belongs to the photo carousel (or
 *   any other horizontal surface).
 *
 *   NATIVE RESTS — scrollbar / keyboard rests can stop anywhere; an
 *   idle watcher (140ms of stillness) aligns them instantly to the
 *   nearest whole scene while the viewport is over the reel, so even
 *   browser-native scrolling cannot rest between two scenes.
 *
 * The reel never traps anyone: below the last scene (and above the
 * first) the browser owns scrolling entirely.
 */

/** Every element carrying this attribute is one full-screen scene,
 *  in document order. */
const SCENE_SELECTOR = "[data-reel-scene]";

interface Geom {
  count: number;
  /** scene tops in document px */
  tops: number[];
  lastTop: number;
  /** measured height of the final (album) scene — used for the reel
   *  hand-off boundary */
  lastHeight: number;
}

interface DragSession {
  id: number;
  startX: number;
  startY: number;
  /** scroll position when the touch began (document px) */
  startScrollY: number;
  startIndex: number;
  claimed: boolean;
  /** true when the touch began while a transition glide was running —
   *  the session exists only to keep the browser's native pan out of
   *  the glide; it is never claimed */
  locked: boolean;
  /** scene tops captured when the drag was claimed — they do not
   *  change mid-gesture, so the drag never re-queries the DOM */
  tops: number[];
  count: number;
  lastSceneIndex: number;
  crossings: number;
  lastY: number;
  lastT: number;
  /** the previous finger sample — (last − move) spans one move
   *  interval, the velocity sample */
  moveY: number;
  moveT: number;
}

function readGeom(): Geom {
  const els = Array.from(document.querySelectorAll<HTMLElement>(SCENE_SELECTOR));
  const tops = els.map((el) => el.getBoundingClientRect().top + scrollPos());
  const count = els.length;
  const lastEl = count > 0 ? els[count - 1] : null;
  return {
    count,
    tops,
    lastTop: count > 0 ? tops[count - 1] : 0,
    lastHeight: lastEl ? lastEl.getBoundingClientRect().height : 0,
  };
}

/** Uniform read of the document scroll position (viewport scroll in
 *  standards mode == documentElement scrollTop). */
function scrollPos(): number {
  return document.scrollingElement ? document.scrollingElement.scrollTop : window.scrollY;
}

function scrollMax(): number {
  const el = document.scrollingElement;
  if (!el) return 0;
  return Math.max(0, el.scrollHeight - window.innerHeight);
}

/** The scene whose top is nearest to y. */
function nearestIndex(y: number, tops: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < tops.length; i++) {
    const d = Math.abs(tops[i] - y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** The last scene whose top has scrolled to or above y — i.e. the
 *  scene occupying the top of the viewport. */
function topSceneIndex(y: number, tops: number[]): number {
  let i = 0;
  while (i < tops.length - 1 && tops[i + 1] <= y + 2) i++;
  return i;
}

export function useReelPager(armed: boolean): void {
  const armedRef = useRef(armed);
  armedRef.current = armed;
  const reduceRef = useRef(prefersReducedMotion());
  const lockedRef = useRef(false);
  const rafRef = useRef(0);
  const idleRef = useRef(0);
  const dragRef = useRef<DragSession | null>(null);
  const skipClaimRef = useRef(false);

  useEffect(() => {
    reduceRef.current = prefersReducedMotion();
  }, []);

  /* ── one programmatic glide from here to a scene top ──────────── */
  const cancelAnim = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    lockedRef.current = false;
  };

  /* After a glide completes, the target can be stale if the layout
     viewport changed mid-glide — on Android the browser chrome
     collapses/expands as the page scrolls, which re-sizes every 100dvh
     scene and shifts every scene top. Re-read the geometry and, if we
     did not actually land on the target, set the position instantly on
     the nearest scene top (only while still over the reel — a hand-off
     below the album is never yanked). */
  const verifyLanding = (y: number) => {
    if (!armedRef.current) return;
    const now = scrollPos();
    if (Math.abs(now - y) < 2) return;
    const g = readGeom();
    if (g.count < 1 || now > g.lastTop + 1) return;
    const el = document.scrollingElement;
    if (el) el.scrollTop = g.tops[nearestIndex(now, g.tops)];
  };

  const pageTo = (y: number) => {
    cancelAnim();
    const el = document.scrollingElement;
    if (!el) return;
    const startY = scrollPos();
    const dist = y - startY;
    if (reduceRef.current || Math.abs(dist) < 2) {
      el.scrollTop = y;
      return;
    }
    lockedRef.current = true;
    // premium glide + settle — fixed-ish duration so a burst of input
    // can never catch up with itself
    const dur = Math.min(980, Math.max(480, Math.abs(dist) * 0.42));
    const t0 = performance.now();
    const ease = (p: number) => 1 - Math.pow(1 - p, 3);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      el.scrollTop = startY + dist * ease(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = 0;
        lockedRef.current = false;
        verifyLanding(y);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const scheduleIdleAlign = () => {
    if (idleRef.current) window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      idleRef.current = 0;
      if (!armedRef.current || lockedRef.current) return;
      const g = readGeom();
      if (g.count < 1) return;
      const y = scrollPos();
      // only inside the reel (at/above the album scene top) and past
      // the very top of the document
      if (y < 1 || y > g.lastTop + 1) return;
      const target = g.tops[nearestIndex(y, g.tops)];
      if (Math.abs(target - y) > 1) {
        const el = document.scrollingElement;
        if (el) el.scrollTop = target; // instant — native rests just align
      }
    }, 140);
  };

  /* ── WHEEL ───────────────────────────────────────────────────── */
  const onWheel = (e: WheelEvent) => {
    if (!armedRef.current) return;
    // browser zoom / assistive gestures pass through untouched
    if (e.ctrlKey || e.metaKey) return;
    if (lockedRef.current) {
      // a paging glide is in flight — swallow vertical deltas so one
      // physical wheel burst cannot native-scroll past the locked scene
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.cancelable) e.preventDefault();
      return;
    }
    const dY = e.deltaY;
    if (Math.abs(dY) < 2) return;
    if (Math.abs(dY) <= Math.abs(e.deltaX)) return; // horizontal intent
    const g = readGeom();
    if (g.count < 2) return;
    const y = scrollPos();

    let target: number | null = null;

    if (dY > 0) {
      // next scene — only while a further reel scene exists below the
      // current one; past the album the browser owns the scroll
      if (y <= g.lastTop + g.lastHeight - 1) {
        const k = topSceneIndex(y, g.tops);
        if (k < g.count - 1) target = g.tops[k + 1];
      }
    } else {
      // previous scene — engage while the reel still dominates the
      // viewport (the album's top within its upper half), so a reader
      // deep in the normal sections below is never yanked back
      if (y <= g.lastTop + g.lastHeight * 0.5) {
        const k = nearestIndex(y, g.tops);
        if (y > g.lastTop + 2) {
          target = g.lastTop; // partial hand-off → restore the album scene
        } else if (Math.abs(y - g.tops[k]) < 2) {
          target = k > 0 ? g.tops[k - 1] : 0; // aligned → one scene back
        } else {
          target = g.tops[k]; // unaligned → settle on the nearest scene first
        }
      }
    }

    if (target === null || Math.abs(target - y) < 2) return;
    e.preventDefault();
    pageTo(target);
  };

  /* ── TOUCH ───────────────────────────────────────────────────── */
  const onTouchStart = (e: TouchEvent) => {
    skipClaimRef.current = false;
    if (!armedRef.current || dragRef.current) return;
    const t = e.touches[0];
    if (!t) return;

    // never fight a surface that owns its own gestures (e.g. the date
    // scene's scratch canvas, touch-action: none) — the gesture is
    // left entirely to it
    const target = e.target as Element | null;
    if (
      target &&
      typeof target.closest === "function" &&
      target.closest(".scratch-surface, [data-reel-pass]")
    ) {
      skipClaimRef.current = true;
      return;
    }

    dragRef.current = {
      id: t.identifier,
      startX: t.clientX,
      startY: t.clientY,
      startScrollY: scrollPos(),
      startIndex: 0,
      claimed: false,
      // a touch that lands while a glide is running gets a session too —
      // not to claim, but to keep the browser's native pan out of the
      // glide while the pager owns the position
      locked: lockedRef.current,
      tops: [],
      count: 0,
      lastSceneIndex: -1,
      crossings: 0,
      lastY: t.clientY,
      lastT: performance.now(),
      moveY: t.clientY,
      moveT: performance.now(),
    };
  };

  const onTouchMove = (e: TouchEvent) => {
    const s = dragRef.current;
    if (!s) return;
    if (s.locked) {
      // a transition glide is running — prevent the native pan so it
      // cannot fight the pager's own easing
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (s.claimed || skipClaimRef.current) return;
    if (!armedRef.current || lockedRef.current) return;
    // find our touch
    let t: Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === s.id) {
        t = e.touches[i];
        break;
      }
    }
    if (!t) return;

    const dx = t.clientX - s.startX;
    const dy = t.clientY - s.startY;
    // vertical intent: the dominant axis, past a small slop. The slop is
    // kept small (6px) so the claim lands BEFORE the mobile browser's own
    // scroll-start decision (~10px on iOS Safari) — a late claim lets the
    // browser begin a native pan that preventDefault can no longer stop.
    if (Math.abs(dy) < 6 || Math.abs(dy) <= Math.abs(dx)) {
      // keep the finger sample fresh in case the gesture later turns
      // vertical — velocity is measured between the two last samples
      s.lastY = t.clientY;
      s.lastT = performance.now();
      return;
    }

    // decide whether this gesture belongs to the reel
    const g = readGeom();
    if (g.count < 2) return;
    const forward = dy < 0; // finger up → later scenes
    const y0 = s.startScrollY;
    let canClaim = false;
    if (forward) {
      // claim anywhere over the reel INCLUDING the album screen (the
      // last scene) — the release logic hands off past its midpoint, so
      // an upward swipe on the album can never trap the guest. Only a
      // gesture starting below the reel is a native leave.
      canClaim = y0 < g.lastTop + g.lastHeight;
    } else {
      // going back up: only while the reel still dominates the viewport
      canClaim = y0 > 1 && y0 <= g.lastTop + g.lastHeight * 0.5;
    }
    if (!canClaim) {
      dragRef.current = null; // let the browser own this drag entirely
      return;
    }

    // claim: from here the page follows the finger 1:1. The drive for
    // THIS event happens in the second (claimed) listener below, so
    // each move is only ever applied once.
    s.claimed = true;
    s.startIndex = nearestIndex(y0, g.tops);
    s.lastSceneIndex = s.startIndex;
    s.tops = g.tops;
    s.count = g.count;
  };

  const driveDrag = (e: TouchEvent, t: Touch, s: DragSession) => {
    // the gesture turned clearly horizontal mid-drag — hand it back to
    // whatever owns horizontal (the photo carousel) and restore the
    // scene it started on, instantly, so a photo swipe never leaves the
    // page stranded a few pixels off a scene top
    if (Math.abs(t.clientX - s.startX) > Math.abs(t.clientY - s.startY) * 1.2) {
      dragRef.current = null;
      const g = readGeom();
      if (g.count > 0 && g.tops[s.startIndex] !== undefined) {
        const el = document.scrollingElement;
        if (el) el.scrollTop = g.tops[s.startIndex];
      }
      return;
    }
    if (e.cancelable) e.preventDefault();
    const max = scrollMax();
    const next = Math.min(max, Math.max(0, s.startScrollY - (t.clientY - s.startY)));
    const el = document.scrollingElement;
    if (el) el.scrollTop = next;

    // count scene tops crossed during the drag (net) for a sustained
    // multi-scene swipe — walk outward from the previous scene only
    // (the finger cannot skip a top between two frames)
    let i = s.lastSceneIndex;
    while (i < s.count - 1 && s.tops[i + 1] <= next + 2) i++;
    while (i > 0 && s.tops[i] > next + 2) i--;
    if (i !== s.lastSceneIndex) {
      s.crossings += i - s.lastSceneIndex;
      s.lastSceneIndex = i;
    }

    // keep a rolling one-interval velocity sample
    s.moveY = s.lastY;
    s.moveT = s.lastT;
    s.lastY = t.clientY;
    s.lastT = performance.now();
  };

  const onTouchMoveClaimed = (e: TouchEvent) => {
    const s = dragRef.current;
    if (!s || !s.claimed) return;
    let t: Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === s.id) {
        t = e.touches[i];
        break;
      }
    }
    if (!t) return;
    driveDrag(e, t, s);
  };

  const onTouchEnd = () => {
    const s = dragRef.current;
    dragRef.current = null;
    if (!s || s.locked || !s.claimed) return;
    if (lockedRef.current) return;

    const g = readGeom();
    if (g.count < 2) return;
    const y = scrollPos();
    const max = scrollMax();

    // a drag that travelled past most of the album scene has left the
    // reel — finish the hand-off cleanly at the album's bottom (the top
    // of the normal sections) instead of snapping back
    if (y >= g.lastTop + g.lastHeight * 0.5) {
      pageTo(Math.min(max, g.lastTop + g.lastHeight));
      return;
    }

    const dt = Math.max(8, s.lastT - s.moveT);
    const velocity = Math.abs((s.lastY - s.moveY) / dt); // px per ms (approx.)
    const travelled = y - s.startScrollY;
    const vh = window.innerHeight || g.lastHeight;

    let delta = 0;
    if (velocity >= 0.55 && s.crossings === 0) {
      // decisive fling → exactly one scene
      delta = travelled > 0 ? 1 : -1;
    } else if (s.crossings !== 0) {
      // sustained drag — it earned as many scenes as it crossed
      delta = Math.max(-3, Math.min(3, s.crossings));
    } else if (Math.abs(travelled) >= vh * 0.14) {
      // slow, deliberate swipe past the threshold
      delta = travelled > 0 ? 1 : -1;
    }
    const targetIdx = Math.max(0, Math.min(g.count - 1, s.startIndex + delta));
    pageTo(g.tops[targetIdx]);
  };

  const onTouchCancel = () => {
    const s = dragRef.current;
    dragRef.current = null;
    if (!s || s.locked || !s.claimed) return;
    // aborted gesture → return to the scene it started on
    const g = readGeom();
    if (g.count > 0 && g.tops[s.startIndex] !== undefined) {
      pageTo(g.tops[s.startIndex]);
    }
  };

  /* ── effect wiring ───────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => {
      if (armedRef.current && !lockedRef.current) scheduleIdleAlign();
    };
    const onResize = () => {
      // browser chrome collapsing/expanding re-sizes every 100dvh scene —
      // cancel any glide and re-settle on the nearest whole scene shortly
      // after the layout has reflowed
      cancelAnim();
      if (armedRef.current) scheduleIdleAlign();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchmove", onTouchMoveClaimed, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchmove", onTouchMoveClaimed);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (idleRef.current) window.clearTimeout(idleRef.current);
      cancelAnim();
      dragRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
