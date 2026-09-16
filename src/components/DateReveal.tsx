import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Countdown from "./Countdown";
import CelebrationParticles from "./CelebrationParticles";
import ScrollCue from "./ScrollCue";

type Phase = "sealed" | "revealed" | "settled";

interface Props {
  visible: boolean;
  day: string;
  month: string;
  year: string;
  weekday: string;
  time?: string;
  weddingDate: Date;
  /** the couple film's frozen final frame — this scene's OWN background,
   *  rendered inside the section so background + date + countdown + cover
   *  all scroll away together as one unit. */
  bgPoster: string;
  reduceMotion: boolean;
}

/* the painted gold cover — a static reusable asset (public/themes/theme-1/images/scratch.png,
   1457×996, RGBA with a torn organic edge). It is ONLY a cover: the date and
   countdown beneath it stay dynamic DOM. */
const COVER_SRC = "/themes/theme-1/images/scratch.png";
const COVER_W = 1457;
const COVER_H = 996;

/* completion fires once ~50% of the cover's ORIGINALLY-OPAQUE gold has
   actually been erased — measured by sampling the canvas alpha channel,
   never pointer distance / stroke count / events / time. The PNG's torn
   transparent border is excluded from the baseline, so it can't inflate
   the reading. */
const REVEAL_THRESHOLD = 0.5;

/* how long the cover takes to dissolve once the threshold is crossed.
   The canvas transition and the DOM removal use the SAME number, so the
   cover is already fully transparent when it leaves — the hand-off to
   the date and the countdown never shows a cut. */
const FADE_MS = 900;

/* how many sampled points of the canvas are still opaque (alpha > 128).
   Same stride for the baseline snapshot and every later read, so the
   ratio between them is a faithful "fraction erased". */
function countOpaque(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < data.length; i += 4 * 32) {
    if (data[i] > 128) n++;
  }
  return n;
}

/* The rocking wrapper's CURRENT tilt, in radians. Read from the computed
   style — a running CSS animation is reflected there — and parsed from the
   matrix. The rock keyframes are rotation-only, so this is always a 2D
   matrix and `atan2(b, a)` is exactly the angle applied. */
function tiltOf(el: HTMLElement | null): number {
  if (!el) return 0;
  const t = window.getComputedStyle(el).transform;
  if (!t || t === "none") return 0;
  const m = /matrix\(([^)]+)\)/.exec(t);
  if (!m) return 0; // matrix3d — never produced by the rock animation
  const p = m[1].split(",").map(Number);
  return Math.atan2(p[1], p[0]);
}

/* ───────────────────────────────────────────────────────────────
   ScratchCover — the painted PNG rendered into a <canvas> laid
   directly over the (already-rendered) date. Dragging erases the
   image pixels with `destination-out`, so the date beneath shows
   through the holes. At ~50% worn the rest fades away on its own.
   Pointer coords are mapped through the canvas' displayed size, so
   the scratch always lands under the finger at any width.
   ─────────────────────────────────────────────────────────────── */
function ScratchCover({
  onFirstScratch,
  onRevealStart,
  onCoverGone,
  dismiss = false,
  reduceMotion,
  ariaLabel,
}: {
  onFirstScratch: () => void;
  /** fired the instant the ~50% threshold is crossed — the parent starts
   *  the date settle, the warm bloom and the celebration NOW, in parallel
   *  with the cover fade, so there is no visible cut between states */
  onRevealStart: () => void;
  /** fired once the cover has FULLY dissolved and may leave the DOM */
  onCoverGone: () => void;
  /** the guest chose the "or tap to reveal" assist — dissolve the cover
   *  down the same path instead of cutting it away */
  dismiss?: boolean;
  reduceMotion: boolean;
  ariaLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null); // the rocking wrapper
  const tilt = useRef(0); // the wrapper's tilt, captured for the live stroke
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const done = useRef(false);
  const ready = useRef(false);
  const started = useRef(false);
  const lastSample = useRef(0);
  const baseOpaque = useRef(0); // opaque sample count of the freshly-painted cover
  const [fading, setFading] = useState(false);
  // the rock HOLDS (pauses exactly where it is — no snap) while the guest
  // is scratching and while the cover dissolves
  const [hold, setHold] = useState(false);

  /* paint the cover in, sized to the canvas' own pixel box (which
     carries the PNG's exact aspect ratio, so no distortion). Redraws
     if the element is resized before scratching begins. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = COVER_SRC;

    const paint = () => {
      if (cancelled || done.current) return;
      // offsetWidth/Height, NOT the bounding box: the wrapper rocks, and a
      // rotated element's bounding box is larger than the box it occupies.
      // The cover has to be fitted (and later mapped) to the LAYOUT box.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(parent.offsetWidth * dpr));
      const h = Math.max(1, Math.round(parent.offsetHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, w, h);
        ready.current = true; // scratching + sampling only after the cover is drawn
        // snapshot the opaque area of the intact cover as the baseline
        try {
          baseOpaque.current = countOpaque(ctx.getImageData(0, 0, w, h).data);
        } catch {
          baseOpaque.current = 0;
        }
      }
    };

    if (img.complete && img.naturalWidth > 0) paint();
    else {
      img.onload = paint;
      // if the cover can't load, don't trap the guest behind it — run the
      // normal reveal and take the cover out
      img.onerror = () => {
        if (!cancelled) {
          onRevealStart();
          onCoverGone();
        }
      };
    }

    const ro = new ResizeObserver(() => {
      // only re-fit before the guest has started scratching
      if (!drawing.current && last.current === null && !done.current) paint();
    });
    ro.observe(parent);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
    // both callbacks are stable (ref-guarded / setter-only), so this effect
    // paints the cover exactly once — never re-painting over the guest's work
  }, [onRevealStart, onCoverGone]);

  /* fraction of the cover's originally-opaque gold that has been erased */
  const sampleCoverage = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || baseOpaque.current <= 0) return 0;
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
      return 0;
    }
    const nowOpaque = countOpaque(data);
    const erased = (baseOpaque.current - nowOpaque) / baseOpaque.current;
    return erased < 0 ? 0 : erased > 1 ? 1 : erased;
  }, []);

  /* the ONE dissolve — the cover fades to nothing over exactly FADE_MS
     and only then leaves the DOM, so the guest never sees the gold cut
     out from under the date mid-frame */
  const gone = useRef(false);
  const dissolve = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    setFading(true);
    window.setTimeout(onCoverGone, FADE_MS);
  }, [onCoverGone]);

  // the assist path ("or tap to reveal") dissolves on the same path
  useEffect(() => {
    if (dismiss) dissolve();
  }, [dismiss, dissolve]);

  // once the rock has actually been paused (the style is committed), take
  // the EXACT tilt it froze at — so the pointer maths and the pixels the
  // guest sees agree to the pixel, not to within a frame of drift
  useEffect(() => {
    if (hold) tilt.current = tiltOf(shellRef.current);
  }, [hold]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onRevealStart(); // the reveal begins immediately …
    dissolve(); // … while the cover dissolves over FADE_MS …
  }, [onRevealStart, dissolve]);

  const strokeAt = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || done.current || !ready.current) return;

      if (!started.current) {
        started.current = true;
        onFirstScratch(); // one state update, ever — hide the hint
      }

      // finger-tip brush — ~11% of the cover width across, soft at the rim.
      // Erases ONLY under/near the pointer via destination-out: soft
      // circular dabs laid along the path, so a drag leaves one continuous
      // organic trail and nothing else changes. NEVER a global opacity.
      const r = Math.max(16, canvas.width * 0.055);
      ctx.globalCompositeOperation = "destination-out";

      const dab = (px: number, py: number) => {
        const g = ctx.createRadialGradient(px, py, r * 0.3, px, py, r);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(0.6, "rgba(0,0,0,0.92)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      };

      const p0 = last.current;
      if (p0) {
        const dx = x - p0.x;
        const dy = y - p0.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / (r * 0.4)));
        for (let s = 1; s <= steps; s++) {
          dab(p0.x + (dx * s) / steps, p0.y + (dy * s) / steps);
        }
      } else {
        dab(x, y);
      }
      last.current = { x, y };

      // throttled coverage check — sampled, never on every move
      const now = performance.now();
      if (now - lastSample.current > 90) {
        lastSample.current = now;
        if (sampleCoverage() >= REVEAL_THRESHOLD) finish();
      }
    },
    [sampleCoverage, onFirstScratch, finish],
  );

  /* ── finger → canvas pixel ──────────────────────────────────────
     The canvas is never transformed; it lives inside a wrapper that
     ROCKS (rotates about its own centre) while the guest is being
     invited to scratch. A rotation about the centre leaves the centre
     itself fixed, so the tilt can be undone exactly:

       · the bounding-box centre IS the layer's centre,
       · the layout size comes from offsetWidth/Height (a transform never
         changes those), and
       · rotating the finger's delta from the centre by -tilt maps it
         back into the layer's own space.

     So the finger scratches exactly where it touches, whatever the tilt
     happens to be at that instant. The tilt is captured once per stroke
     (the rock holds while the finger is down), so no per-move style
     reads are needed. */
  const toCanvas = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (!rect.width || !rect.height || !w || !h) return null;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const a = tilt.current;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const lx = cos * dx + sin * dy; // inverse rotation about the centre
    const ly = -sin * dx + cos * dy;
    return {
      x: (lx + w / 2) * (canvas.width / w),
      y: (ly + h / 2) * (canvas.height / h),
    };
  };

  return (
    /* The ROCK lives on a WRAPPER, never on the canvas: the canvas keeps its
       own untransformed geometry, the wrapper only tilts the painted
       surface in its own place (rotation about its centre — no travel, no
       bounce), and the tilt is undone in `toCanvas`. The wrapper is the
       canvas' parent, so the paint effect above still measures and fits
       the same box. */
    <div
      ref={shellRef}
      className="absolute inset-0"
      style={{
        animation: reduceMotion ? "none" : "scratchRock 2.8s ease-in-out infinite",
        // hold, don't jerk: the surface freezes where it is under the finger
        // and while the cover dissolves
        animationPlayState: hold || fading ? "paused" : "running",
        willChange: "transform",
      }}
    >
      <canvas
        ref={canvasRef}
        className="scratch-surface absolute inset-0 w-full h-full"
        style={{
          touchAction: "none",
          opacity: fading ? 0 : 1,
          // once the dissolve starts the surface stops claiming pointers, so
          // the reel gesture is never swallowed by a cover that is leaving
          pointerEvents: fading ? "none" : "auto",
          transition: `opacity ${FADE_MS}ms ease`,
          filter: "drop-shadow(0 6px 20px rgba(60,42,16,0.28))",
        }}
        onPointerDown={(e) => {
          if (done.current) return;
          e.preventDefault();
          // freeze the rock for the stroke and capture the tilt it froze at
          tilt.current = tiltOf(shellRef.current);
          setHold(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          drawing.current = true;
          last.current = null;
          const p = toCanvas(e);
          if (p) strokeAt(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || done.current) return;
          e.preventDefault();
          const p = toCanvas(e);
          if (p) strokeAt(p.x, p.y);
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
          setHold(false); // the rock resumes from exactly where it held
        }}
        onPointerCancel={() => {
          drawing.current = false;
          last.current = null;
          setHold(false);
        }}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   The date as one cinematic frame — dynamic DOM, never an image.
   The numeral is the anchor; the month is a wordmark tracked to
   the numeral's width; weekday and year/time are readable at a
   glance. Same identity serif as the couple names.
   ─────────────────────────────────────────────────────────────── */
function DateFace({
  day,
  month,
  year,
  weekday,
  time,
}: {
  day: string;
  month: string;
  year: string;
  weekday: string;
  time?: string;
}) {
  const legible = "0 1px 2px rgba(38,26,14,0.22)";
  const label: React.CSSProperties = {
    fontFamily: "var(--font-invite-label)",
    fontWeight: 500,
    color: "var(--text-secondary)",
    fontSize: "clamp(11px,3.3vw,14px)",
    letterSpacing: "0.32em",
    marginLeft: "0.32em",
    textTransform: "uppercase",
    textShadow: legible,
  };
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <span style={label}>{weekday}</span>

      {/* the anchor — Fraunces, large but not oversized; special through
          the letterforms and the space around it, not raw size. It reads
          as the primary date anchor while SATURDAY / DECEMBER / year
          hold a tight editorial lockup around it. */}
      <span
        style={{
          fontFamily: "var(--font-couple)",
          fontOpticalSizing: "auto",
          fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
          fontWeight: 500,
          color: "var(--text-primary)",
          fontSize: "clamp(96px,31vw,156px)",
          letterSpacing: "0.005em",
          lineHeight: 0.86,
          // tight within the numeral's own unit — weekday → 12 → month
          // read as one composition, not three floating lines
          margin: "clamp(1px,0.4vh,4px) 0 clamp(2px,0.6vh,6px)",
          textShadow: "0 1px 3px rgba(38,26,14,0.26)",
        }}
      >
        {day}
      </span>

      {/* the month — tracked out to sit under the numeral edge to edge */}
      <span
        style={{
          fontFamily: "var(--font-engrave)",
          fontWeight: 600,
          color: "var(--gold-invite)",
          fontSize: "clamp(17px,5.3vw,23px)",
          letterSpacing: "0.4em",
          marginLeft: "0.4em",
          textTransform: "uppercase",
          textShadow: legible,
        }}
      >
        {month}
      </span>

      <span style={{ ...label, marginTop: "clamp(8px,1.8vh,12px)", fontSize: "clamp(11px,3.1vw,13.5px)", letterSpacing: "0.24em", marginLeft: "0.24em", color: "var(--text-tertiary)" }}>
        {year}{time ? ` · ${time}` : ""}
      </span>
    </div>
  );
}

export default function DateReveal({
  visible,
  day,
  month,
  year,
  weekday,
  time,
  weddingDate,
  bgPoster,
  reduceMotion,
}: Props) {
  const [phase, setPhase] = useState<Phase>(reduceMotion ? "settled" : "sealed");
  const [coverMounted, setCoverMounted] = useState(!reduceMotion);
  const [dismissCover, setDismissCover] = useState(false);
  const [started, setStarted] = useState(false);
  const [showAssist, setShowAssist] = useState(false);
  const [entered, setEntered] = useState(reduceMotion);
  const [bloom, setBloom] = useState(false); // brief warm light across the art
  const [sprinkle, setSprinkle] = useState(false); // brief celebratory particles
  const [showScrollCue, setShowScrollCue] = useState(false); // date scene's scroll invitation
  const sectionRef = useRef<HTMLElement | null>(null);
  const bloomTimers = useRef<number[]>([]);

  /* The phase read from inside STABLE callbacks (a ref, not state): the
     scratch canvas reads its callbacks once and must never be re-painted
     — a changing callback identity would re-run its paint effect and
     wipe the guest's scratching. */
  const phaseRef = useRef<Phase>(reduceMotion ? "settled" : "sealed");
  const goPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const canScratch = useMemo(() => {
    try {
      return !!document.createElement("canvas").getContext("2d");
    } catch {
      return false;
    }
  }, []);

  // the section eases in the first time it scrolls into view (once)
  useEffect(() => {
    if (entered) return;
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setEntered(true);
          obs.disconnect();
        }
      },
      // a touch earlier than mid-scroll, so the section is already easing
      // in as it lands rather than popping once it has arrived
      { threshold: 0.22 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [entered]);

  // a gentle assist if the guest hasn't started after a few seconds
  useEffect(() => {
    if (phase !== "sealed" || reduceMotion) return;
    const t = setTimeout(() => setShowAssist(true), 5000);
    return () => clearTimeout(t);
  }, [phase, reduceMotion]);

  // one coordinated cinematic reveal — no state "cuts". Fired the instant
  // the scratch threshold is crossed, it runs IN PARALLEL with the cover
  // dissolving, never after it: the date settles in immediately, the warm
  // bloom rises, the celebration fires, and the countdown is already
  // emerging at half strength beneath it. The light then recedes — slowly,
  // like sunlight passing across the painting — finishing just as the
  // countdown completes at NORMAL, full brightness. The final settled
  // scene carries no dimming layer of any kind: just the artwork at rest.
  const beginReveal = useCallback(() => {
    if (phaseRef.current !== "sealed") return;
    bloomTimers.current.forEach((t) => clearTimeout(t));
    bloomTimers.current = [];
    if (reduceMotion) {
      goPhase("settled");
      setCoverMounted(false);
      return;
    }
    goPhase("revealed"); // the date begins settling NOW, under the dissolving cover
    setBloom(true);
    setSprinkle(true);
    bloomTimers.current.push(
      window.setTimeout(() => setBloom(false), 1700), // light begins to recede (2.2s gentle exit)
      window.setTimeout(() => goPhase("settled"), 2300), // countdown completes at full brightness
      window.setTimeout(() => setSprinkle(false), 3000), // particles done, unmount
    );
  }, [goPhase, reduceMotion]);

  /* the cover leaves the DOM only once it has fully dissolved */
  const handleCoverGone = useCallback(() => setCoverMounted(false), []);

  const forceReveal = useCallback(() => {
    setStarted(true);
    setDismissCover(true); // the assist dissolves the cover, it never cuts it
    beginReveal();
  }, [beginReveal]);

  useEffect(() => {
    if (!canScratch && phase === "sealed") forceReveal();
  }, [canScratch, phase, forceReveal]);

  useEffect(
    () => () => { bloomTimers.current.forEach((t) => clearTimeout(t)); },
    [],
  );

  /* the scroll invitation is anchored to the COUNTDOWN having settled —
     not to the section mounting — and reuses the existing phase as its
     clock instead of adding a second, independent one */
  useEffect(() => {
    if (phase !== "settled") return;
    const t = window.setTimeout(() => setShowScrollCue(true), 3600);
    return () => window.clearTimeout(t);
  }, [phase]);

  const sealed = phase === "sealed";
  const revealed = phase === "revealed";
  const settled = phase === "settled";

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100dvh", isolation: "isolate" }}
    >
      {/* THIS SCENE'S OWN BACKGROUND — the couple film's frozen final
          frame, inside the section, so the whole Date scene (background +
          scratch + date + countdown) scrolls away together as one unit.
          Same 720×1280 art / `object-fit: cover` centring as the couple
          film it continues from — visually seamless. */}
      <img
        src={bgPoster}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover", objectPosition: "center", zIndex: 0 }}
      />

      {/* only a barely-there warm wash over the arch's centre so the date
          stays legible — no panel, no card, no gradient that changes the
          painting. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse 82% 54% at 50% 44%, rgba(252,248,240,0.28) 0%, rgba(252,248,240,0.06) 60%, transparent 82%)",
        }}
      />

      {/* a brief, low-intensity warm bloom — light passing across the
          painted artwork as the cover gives way. It fades IN with the
          reveal, holds while the date settles, then recedes over a long,
          gentle 2.2s ease — a sunset, not a switch — ending exactly as
          the countdown finishes easing in. The final scene sits at full,
          normal brightness: never a flash, never a veil, never a dim. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 9,
          mixBlendMode: "screen",
          background:
            "radial-gradient(ellipse 88% 58% at 50% 42%, rgba(255,239,209,0.34) 0%, rgba(255,232,196,0.10) 44%, transparent 74%)",
          opacity: bloom ? 1 : 0,
          transform: bloom ? "scale(1.035)" : "scale(1)",
          transition: bloom
            ? "opacity 0.7s ease, transform 2s ease"
            : "opacity 2.2s ease, transform 2.2s ease",
        }}
      />

      {/* a few elegant celebratory flecks the moment the cover gives way —
          gold and blush, short-lived, well clear of the date. Not confetti.
          These are synced to the ACTUAL reveal (the threshold crossing),
          never to the section loading. */}
      <CelebrationParticles active={sprinkle && !reduceMotion} count={6} durationMs={2100} />

      {/* ── the arch's clear channel — clear of the lanterns above and
          the domed pavilions below ── */}
      <div
        className="absolute inset-0 flex flex-col items-center"
        style={{
          justifyContent: "center",
          // `dvh` — the section (and its poster background) is 100dvh, so
          // the date holds its place in the painted arch's negative space
          // whether or not the mobile browser chrome is showing.
          paddingTop: "clamp(140px, 21dvh, 206px)",
          paddingBottom: "clamp(74px, 15dvh, 146px)",
          paddingLeft: "clamp(4px, 2vw, 14px)",
          paddingRight: "clamp(4px, 2vw, 14px)",
          zIndex: 8,
          userSelect: "none",
          WebkitUserSelect: "none",
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(18px)",
          transition: reduceMotion
            ? "none"
            : "opacity 1.25s ease, transform 1.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* THE DATE STAGE — the dynamic date, with the painted cover
            laid directly over it (canvas carries the PNG's aspect
            ratio, so it scales without distortion). The date eases from a
            whisper of scale into place as the cover dissolves — the same
            gesture, not a separate render. */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: "min(97vw, 460px)",
            transform: sealed ? "scale(0.982) translateY(4px)" : "scale(1) translateY(0)",
            transition: reduceMotion ? "none" : "transform 1.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* THE CELEBRATION — a small burst of gold sparks out of the
              date's own centre at the instant it is revealed. It sits
              BEHIND the numerals (zIndex -1 inside this stage's own
              stacking context, created by its transform), so the light
              reads as coming from the date rather than being sprayed
              over it. Vertical travel is compressed so the sparks stay in
              the arch's channel and never reach the countdown. */}
          <div style={{ position: "absolute", inset: 0, zIndex: -1 }}>
            <CelebrationParticles
              mode="burst"
              active={sprinkle && !reduceMotion}
              count={14}
              durationMs={2200}
            />
          </div>

          <DateFace day={day} month={month} year={year} weekday={weekday} time={time} />

          {coverMounted && canScratch && (
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                transform: "translate(-50%, -50%)",
                width: "100%",
                aspectRatio: `${COVER_W} / ${COVER_H}`,
              }}
            >
              <ScratchCover
                onFirstScratch={() => setStarted(true)}
                onRevealStart={beginReveal}
                onCoverGone={handleCoverGone}
                dismiss={dismissCover}
                reduceMotion={reduceMotion}
                ariaLabel="Scratch the gold cover to reveal the wedding date"
              />
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: "-10%",
                  textAlign: "center",
                  fontFamily: "var(--font-invite-label)",
                  color: "var(--text-tertiary)",
                  fontSize: "clamp(8px,2.2vw,10px)",
                  letterSpacing: "0.4em",
                  marginLeft: "0.4em",
                  textTransform: "uppercase",
                  opacity: started ? 0 : 0.82,
                  transition: "opacity 0.5s ease",
                  textShadow: "0 1px 8px rgba(250,244,234,0.6)",
                  pointerEvents: "none",
                }}
              >
                Scratch to reveal
              </span>
              {showAssist && !started && (
                <button
                  type="button"
                  onClick={forceReveal}
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "-26%",
                    transform: "translateX(-50%)",
                    fontFamily: "var(--font-invite-label)",
                    color: "var(--gold-invite)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    marginLeft: "0.2em",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(184,148,63,0.3)",
                    paddingBottom: 2,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  or tap to reveal
                </button>
              )}
            </div>
          )}
        </div>

        {/* countdown — no rule, no box; a quiet band of type held a
            generous gap below the date, subordinate to it.

            Its SPACE is reserved from the start: the countdown component
            is mounted from the moment the section is live and simply
            held at zero opacity, so the date never shifts up when the
            numbers arrive (that layout jump was the visible "cut").

            And it emerges ACROSS the reveal rather than after it: already
            half-lit while the cover dissolves, complete as the scene
            settles. One interpolation of opacity + a whisper of scale and
            travel — never a display swap, never a second entrance. */}
        <div
          className="flex flex-col items-center"
          style={{
            marginTop: "clamp(28px, 6.5dvh, 56px)",
            opacity: settled ? 1 : revealed ? 0.45 : 0,
            transform: settled
              ? "translateY(0) scale(1)"
              : revealed
                ? "translateY(4px) scale(0.994)"
                : "translateY(14px) scale(0.985)",
            transition: reduceMotion
              ? "none"
              : "opacity 1.4s ease, transform 1.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <Countdown targetDate={weddingDate} visible={visible} />
        </div>
      </div>

      {/* the scroll invitation — the same chevron + SCROLL NOW mark the
          couple scene closes on, set into the empty band beneath the
          countdown. It waits for the countdown to settle (the phase
          above), and it is purely visual: the reel pager owns the
          gesture, so it can never interfere with the scratch above it. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "max(clamp(16px, 3.4dvh, 32px), env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
          zIndex: 12,
          pointerEvents: "none",
          opacity: showScrollCue ? 1 : 0,
          transition: reduceMotion ? "none" : "opacity 1.2s ease",
        }}
      >
        <ScrollCue shown={showScrollCue} reduceMotion={reduceMotion} />
      </div>
    </section>
  );
}
