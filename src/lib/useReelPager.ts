import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * useReelPager — ONE coherent full-screen scene navigator for the
 * invitation's cinematic reel.
 *
 * Every full-screen scene in the guest journey (Couple, Date, the
 * Celebrations chapter page, every ceremony, every one of the Couple
 * Photo album's photographs, Venue, RSVP, and the Closing page) is
 * marked with `data-reel-scene`. The ENTIRE invitation, top to bottom,
 * is one reel now — there is no longer a "the reel ends after the
 * album, normal page scrolling resumes after that" hand-off; Venue,
 * RSVP and Closing used to be plain document-flow sections with
 * content-driven, inconsistent heights, which is exactly what let a
 * guest rest halfway between two of them (a real geometry bug, not a
 * gesture bug — `readGeom()` only ever sees `[data-reel-scene]`
 * elements, so an untagged section was invisible to this whole
 * mechanism and the browser was free to rest anywhere inside it).
 * Fixed by giving those three sections the same `data-reel-scene` +
 * fixed `100dvh` treatment every earlier scene already used — this file
 * needed no new concept, only more scenes tagged correctly.
 *
 * Scenes sit in normal document flow, each one viewport tall, each
 * carrying its OWN background so background + foreground move together.
 * This hook is the single piece of input logic that turns that flow
 * into a vertical reels-style experience:
 *
 *   · one gesture = one scene (never Event 1 → Event 3 by accident)
 *   · a transition lock holds while the scene glides, so gestures can
 *     not double-fire or stack mid-move
 *   · small accidental touch movement stays below a threshold
 *   · a rest is ALWAYS a complete scene — never a stable half-and-half
 *   · every programmatic move uses ONE glide curve (`GLIDE`): a soft,
 *     deliberate start bleeding into a long landing, evaluated exactly,
 *     so a scene change is smooth and cinematic rather than flicked
 *   · a native rest (scrollbar, keyboard) is eased onto its scene with
 *     that same glide — it is never snapped onto it
 *   · the first scene cannot scroll above the invitation; the last
 *     scene (now the Closing page) cannot scroll below it — there is
 *     nothing beneath it for the browser to hand off to any more
 *
 * The mechanism is deliberately low-level and single-owner:
 *
 *   WHEEL — a claimed wheel event pages exactly one scene (it calls
 *   preventDefault so the native scroll burst can never run through
 *   several scenes). Gestures that would leave the reel are NOT
 *   claimed and the browser scrolls normally.
 *
 *   TOUCH — vertical intent (|dy| clearly > |dx|, past a small slop)
 *   is claimed; from that moment the page follows the finger 1:1. On
 *   release, ONE gesture earns AT MOST one scene of movement — a
 *   decisive fling, a slow deliberate swipe past the distance
 *   threshold, and a sustained drag that visually crossed several scene
 *   tops while the finger was moving all resolve to the same single-
 *   scene step; a short nudge settles back. This is deliberate: an
 *   earlier version let a sustained drag earn up to three scenes at
 *   once (via how many scene tops it crossed), which is exactly what
 *   let one strong swipe skip ahead multiple sections instead of
 *   advancing one at a time. Horizontal intent is never claimed — if a
 *   scene ever grows a horizontal surface, that surface owns it.
 *
 *   LAST-SCENE HAND-OFF — leaving the reel from its final scene (e.g.
 *   the photo album's last picture) uses the SAME one-gesture-one-step
 *   threshold as every internal transition, never a separate, larger
 *   distance requirement. An earlier version required a drag to travel
 *   past 50% of the viewport specifically to leave the reel, which
 *   silently re-settled a normal swipe back onto the same final scene —
 *   the "stuck, have to swipe repeatedly" boundary bug.
 *
 *   NATIVE RESTS — scrollbar / keyboard rests can stop anywhere; an
 *   idle watcher (140ms of stillness) eases them onto the nearest whole
 *   scene while the viewport is over the reel (same glide as a gesture,
 *   never a snap), so even browser-native scrolling cannot rest between
 *   two scenes.
 *
 * The reel never traps anyone: below the last scene (and above the
 * first) the browser owns scrolling entirely.
 */

/** Every element carrying this attribute is one full-screen scene,
 *  in document order. */
const SCENE_SELECTOR = "[data-reel-scene]";

/** How long after a landing a wheel gesture is still ignored — one
 *  physical wheel burst (or a trackpad's momentum tail) pages exactly
 *  one scene, never two. Nudged 200ms → 350ms: a trackpad's momentum
 *  tail after a strong swipe can keep emitting wheel deltas well past
 *  200ms, and any of those that arrived just after the old, shorter
 *  window closed would read as a brand-new gesture and page a second
 *  scene — the "one strong scroll skips ahead" symptom for wheel/
 *  trackpad input. Still short enough that back-to-back INTENTIONAL
 *  scrolls never feel throttled. */
const WHEEL_SETTLE_MS = 350;

/** An exact cubic-bezier timing function, returned as `y(x)`. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number): number => {
    // Newton–Raphson first (converges in a few steps for these curves),
    // then bisection as a guaranteed fallback
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-4) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      if (err > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** The pager's glide. A pure ease-out (a cubic) begins at full velocity,
 *  which reads as a flick; this is a close relative of the invitation's
 *  own `cubic-bezier(0.22, 1, 0.36, 1)` with a gentler attack — a slow,
 *  controlled start that bleeds into a long, calm landing. */
const GLIDE = cubicBezier(0.34, 0, 0.18, 1);

interface Geom {
  count: number;
  /** scene tops in document px */
  tops: number[];
  lastTop: number;
  /** measured height of the final scene (the album's last photograph) —
   *  used for the reel hand-off boundary */
  lastHeight: number;
  /** the scene elements themselves, same order as `tops` — needed only to
   *  check a forward move against an optional `ReelGate` (see below);
   *  every other calculation in this file still works from `tops` alone */
  els: HTMLElement[];
}

/**
 * An optional single gate on ONE scene the reel already knows about (by
 * DOM identity, via `isGated`) — e.g. "don't let the guest leave Save the
 * Date before it's revealed." This is the pager's own decision logic
 * consulted at the exact moment a forward move is about to commit, NOT a
 * second navigation system: the gate never claims a gesture, never moves
 * the scroll position itself, and blocking simply means the normal
 * forward move that would have happened here does not.
 */
export interface ReelGate {
  /** true for the one scene element this gate governs */
  isGated: (el: HTMLElement) => boolean;
  /** false while that scene is not yet allowed to be left going forward */
  canLeave: () => boolean;
  /** called once per blocked forward attempt (wheel notch or a released
   *  touch drag) — never on a claim, a backward move, or a resting glide */
  onBlocked: () => void;
}

/** True only when `fromIndex` is the gate's own scene AND it is not yet
 *  allowed to be left. Used identically by the wheel and touch paths so
 *  a guest cannot leave Save the Date forward through either gesture. */
function blockedLeaving(gate: ReelGate | undefined, g: Geom, fromIndex: number): boolean {
  if (!gate) return false;
  const el = g.els[fromIndex];
  if (!el || !gate.isGated(el)) return false;
  return !gate.canLeave();
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
    els,
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

export function useReelPager(armed: boolean, gate?: ReelGate): void {
  const armedRef = useRef(armed);
  armedRef.current = armed;
  const gateRef = useRef(gate);
  gateRef.current = gate;
  const reduceRef = useRef(prefersReducedMotion());
  const lockedRef = useRef(false);
  const rafRef = useRef(0);
  const idleRef = useRef(0);
  /** performance.now() until which wheel input stays swallowed (see
   *  WHEEL_SETTLE_MS) */
  const settleRef = useRef(0);
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
    // premium glide + settle — ONE smooth move whose duration scales
    // gently with distance and is capped, so a burst of input can never
    // catch up with itself
    const dur = Math.min(1040, Math.max(560, Math.abs(dist) * 0.52));
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      el.scrollTop = startY + dist * GLIDE(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = 0;
        lockedRef.current = false;
        settleRef.current = performance.now() + WHEEL_SETTLE_MS;
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
      // only inside the reel and past the very top of the document. Was
      // bounded to `g.lastTop + 1` — i.e. only up to the LAST scene's
      // own top — which left native drift landing anywhere within the
      // last scene's own body (past its top) uncorrected. Now that the
      // reel runs the full document, "inside the reel" means anywhere
      // up to the last scene's bottom, so a native rest is always eased
      // onto an exact scene top no matter which scene it lands in.
      if (y < 1 || y > g.lastTop + g.lastHeight + 1) return;
      let idx = nearestIndex(y, g.tops);
      // a native rest (scrollbar drag, keyboard) landed PAST a gated,
      // not-yet-leavable scene — the wheel/touch paths already refuse to
      // carry a gesture past it, but a native scroll bypasses both, so
      // this same settle re-anchors it back onto the gated scene instead
      // of easing onto wherever it actually stopped
      const gate = gateRef.current;
      if (gate) {
        const gatedIdx = g.els.findIndex((el) => gate.isGated(el));
        if (gatedIdx !== -1 && idx > gatedIdx && !gate.canLeave()) {
          idx = gatedIdx;
          gate.onBlocked();
        }
      }
      const target = g.tops[idx];
      if (Math.abs(target - y) > 1) {
        // align with the SAME glide a gesture uses: a native rest (a
        // scrollbar drag, a keyboard press, an Android fling that stops
        // between scenes) eases onto its whole scene instead of snapping
        // onto it, so nothing on the reel ever jumps
        pageTo(target);
      }
    }, 140);
  };

  /* ── WHEEL ───────────────────────────────────────────────────── */
  const onWheel = (e: WheelEvent) => {
    if (!armedRef.current) return;
    // browser zoom / assistive gestures pass through untouched
    if (e.ctrlKey || e.metaKey) return;
    if (lockedRef.current || performance.now() < settleRef.current) {
      // a paging glide is in flight (or has just landed) — swallow
      // vertical deltas so one physical wheel burst, or a trackpad's
      // momentum tail, cannot native-scroll past the scene we settled on
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
      // current one; past the last scene the browser owns the scroll
      if (y <= g.lastTop + g.lastHeight - 1) {
        const k = topSceneIndex(y, g.tops);
        if (blockedLeaving(gateRef.current, g, k)) {
          // a gated scene (Save the Date, not yet revealed) — swallow
          // the gesture entirely rather than paging forward, and let the
          // gate show its own notice; the guest stays exactly where
          // they are, same as if this wheel notch never happened
          gateRef.current?.onBlocked();
          e.preventDefault();
          return;
        }
        if (k < g.count - 1) target = g.tops[k + 1];
      }
    } else {
      // previous scene — engage anywhere within the reel. (This used to
      // stop at "the album's top within its upper half" plus a special
      // "partial hand-off, restore the last reel scene" branch for
      // y past that point — both existed only because Venue/RSVP/
      // Closing used to be plain document content below the reel, which
      // no longer exists: the reel now runs the full document, so there
      // is nothing left for either of those special cases to do.)
      if (y <= g.lastTop + g.lastHeight) {
        const k = nearestIndex(y, g.tops);
        if (Math.abs(y - g.tops[k]) < 2) {
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
      // claim anywhere over the reel INCLUDING its final scene (Closing)
      // — the release logic hands off to `onTouchEnd`'s own bounds check
      // rather than a second threshold, so an upward swipe on the last
      // scene can never trap the guest. Only a gesture starting at the
      // absolute end of the document has nothing left to claim.
      canClaim = y0 < g.lastTop + g.lastHeight;
    } else {
      // going back up: the reel now runs the full document (Venue/RSVP/
      // Closing are reel scenes too, not plain content below it), so a
      // backward swipe is claimed anywhere within it — never restricted
      // to "near the boundary" the way it had to be when those sections
      // were normal, un-tagged document flow.
      canClaim = y0 > 1 && y0 <= g.lastTop + g.lastHeight;
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
    // whatever owns horizontal (no reel scene does today; this is the
    // safety valve if one ever does) and restore the scene it started on,
    // instantly, so a horizontal drag never leaves the page stranded a
    // few pixels off a scene top
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

    const dt = Math.max(8, s.lastT - s.moveT);
    const velocity = Math.abs((s.lastY - s.moveY) / dt); // px per ms (approx.)
    const travelled = y - s.startScrollY;
    const vh = window.innerHeight || g.lastHeight;

    // ONE gesture earns AT MOST one scene of movement — a fast fling, a
    // slow deliberate swipe, and a drag that visually crossed several
    // scene tops while the finger was still moving all resolve to the
    // same ±1. (Previously a sustained drag could earn up to ±3 scenes
    // via `s.crossings`, which is exactly what let one strong gesture
    // skip 2–3 sections instead of advancing one at a time.)
    let delta = 0;
    if (velocity >= 0.55 && s.crossings === 0) {
      // decisive fling → exactly one scene
      delta = travelled > 0 ? 1 : -1;
    } else if (s.crossings !== 0) {
      delta = s.crossings > 0 ? 1 : -1;
    } else if (Math.abs(travelled) >= vh * 0.14) {
      // slow, deliberate swipe past the threshold
      delta = travelled > 0 ? 1 : -1;
    }

    // a gated scene (Save the Date, not yet revealed) — a forward swipe
    // that would otherwise leave it snaps straight back to where the
    // gesture started instead, and the gate shows its own notice. Only
    // checked for a genuine forward move (delta > 0); backward and
    // in-place gestures are never affected.
    if (delta > 0 && blockedLeaving(gateRef.current, g, s.startIndex)) {
      gateRef.current?.onBlocked();
      pageTo(g.tops[s.startIndex]);
      return;
    }

    // FIX: leaving the reel from its LAST scene (the album's final
    // photograph) used to require a separate, much bigger gesture (the
    // drag had to travel past 50% of the viewport) than an ordinary
    // internal transition (14%, or any decisive fling) — any swipe in
    // between those two thresholds silently re-settled back onto the
    // same last photograph, which is exactly the "stuck at the carousel
    // boundary, have to swipe repeatedly" bug. The fix: compute the
    // desired index with the SAME rule as every other transition above,
    // and if that pushes past the reel's last scene, hand off to the
    // normal document sections below (Venue) instead of clamping back —
    // never a second gesture threshold, never a dead zone. Backward
    // navigation at index 0 needs no equivalent case: there is nothing
    // above the first scene, so clamping to 0 there is already correct.
    const desiredIndex = s.startIndex + delta;
    if (desiredIndex >= g.count) {
      pageTo(Math.min(max, g.lastTop + g.lastHeight));
      return;
    }
    const targetIdx = Math.max(0, Math.min(g.count - 1, desiredIndex));
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
