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
  /** this scene's OWN background — theme.assets.dateRevealPoster, a
   *  dedicated "Save the Date" composition (see the layout notes below),
   *  rendered inside the section so background + date + countdown + cover
   *  all scroll away together as one unit. NOT the Couple Card's
   *  wallpaper — that used to be shared here, which is why the geometry
   *  notes below exist: swapping the asset meant the whole layout had to
   *  be re-measured against the new artwork, not just re-skinned. */
  bgPoster: string;
  reduceMotion: boolean;
}

/* ── LAYOUT — measured against the CURRENT savethedate.jpg, pixel-
   sampled and visually inspected, not guessed. IMPORTANT: the artwork
   was replaced AGAIN since the previous pass (768×1376 → 784×1373, and
   a genuinely different, monochrome antique-cream/rose-gold palette —
   no more distinct pink/sage colour blocks) — every number below was
   re-derived from scratch against the CURRENT file, none carried over.

   The composition is: "SAVE THE DATE" lettered into the art up top
   (≈0–22% height — the section adds NO heading of its own), then a
   stack of nested scalloped frames roughly ≈23–68% height, then a large
   OPEN cream field ≈68–90% height before a lotus-flower border confined
   mostly to the bottom corners (with a small mandala emblem centred at
   the very bottom, ≈94–100%):

     · the innermost blank IVORY panel (scratch + date's original home)
       is ≈31–60% height × ≈22–78% width — real, but visibly smaller
       than the ornamental frame built around it, which is what read as
       "still too small" even after a previous enlargement.
     · the OUTER patterned square frame — the largest concentric
       rectangle in the composition, before the corner paisley motifs
       above it and the lotus border below it — is ≈26–66% height ×
       ≈6–94% width. Sizing the scratch/date stage to (just inside) THIS
       outer boundary, rather than the innermost panel, is what actually
       delivers a clearly-noticeable, "roughly doubled" scratch image:
       ≈48dvh vs. the innermost panel's own ≈31dvh-equivalent width — a
       real jump, not a 10–20% nudge. A gold scratch card temporarily
       overlapping the outer frame's own printed pattern is the same
       thing a real scratch-off sticker does to whatever is printed
       under it — once scratched away, the artwork is fully visible
       again, so this is not a permanent collision with the artwork.
     · below the frame stack, a large OPEN cream field, clear of any
       decoration in its own horizontal centre from ≈68% down to ≈90% of
       image height (the lotus-flower illustrations stay confined to the
       outer ~30% on each side and only start that low) — a genuinely
       generous, unbroken stage for the countdown, much larger than the
       previous artwork's own dedicated pedestal shape.

   Because `object-fit: cover` height-matches this portrait art on every
   phone (same principle as the Couple scene's video — see brain.md
   "Artwork geometry facts"), a measured image-height-% maps directly to
   the same dvh-%. WIDTH does not map to vw the same reliable way (cover
   only guarantees the HEIGHT axis matches 1:1; the width crop varies
   with each device's own aspect ratio) — so a width that must track the
   artwork's own composition is expressed in dvh too, via the image's own
   aspect ratio (784/1373 ≈ 0.571), not vw: see `min(48dvh, …)` below. */
const DATE_STAGE_TOP_DVH = 25;
const DATE_STAGE_BOTTOM_DVH = 34; // = 100 − 66
const COUNTDOWN_TOP_DVH = 68;
// = 100 − 87: the open cream field actually runs clear to ≈90%, but the
// zone is held a few dvh short of that so the boxes keep real breathing
// room from the ScrollCue anchored near the very bottom of the section,
// rather than using every last available pixel right up to it.
const COUNTDOWN_BOTTOM_DVH = 13;

/* the painted gold cover — a static reusable asset (public/themes/theme-1/
   images/scratch.png, RGBA with a torn organic edge). It is ONLY a cover:
   the date and countdown beneath it stay dynamic DOM.

   ⚠️ REAL BUG, FOUND AND FIXED: this was hardcoded to `1457×996` (a
   1.463:1 landscape ratio) across several previous passes, but the
   actual file — inspected directly, pixel data read, not assumed — is
   **500×500, a perfect square**. Every `aspectRatio` built from the old
   constants was therefore forcing this square artwork into a much wider,
   shorter box, which the browser fills by STRETCHING the image
   (distorting the torn-edge artwork) — and, far more importantly, by
   giving the cover much LESS effective height than its width, so a
   portrait text stack (weekday → numeral → month → year/time) taller
   than that squashed height could show slivers of itself above/below the
   cover. This is the actual root cause the "date peeks out around the
   scratch image" report was describing. Fixing these two constants to
   match the real file removes the distortion AND — because a SQUARE
   cover sized to the same width now has far more height than the old
   landscape shape did — resolves the coverage gap directly, without
   needing the cover to become impractically wide. */
const COVER_SRC = "/themes/theme-1/images/scratch.png";
const COVER_W = 500;
const COVER_H = 500;

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
  onRevealStart,
  onCoverGone,
  dismiss = false,
  reduceMotion,
  ariaLabel,
}: {
  /** fired the instant the ~50% threshold is crossed — the parent starts
   *  the date settle, the warm bloom and the celebration NOW, in parallel
   *  with the cover fade, so there is no visible cut between states */
  onRevealStart: () => void;
  /** fired once the cover has FULLY dissolved and may leave the DOM */
  onCoverGone: () => void;
  /** the silent `!canScratch` fallback — dissolve the cover down the
   *  same path instead of cutting it away */
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
  const lastSample = useRef(0);
  const baseOpaque = useRef(0); // opaque sample count of the freshly-painted cover
  const [fading, setFading] = useState(false);
  // the rock HOLDS (pauses exactly where it is — no snap) while the guest
  // is scratching and while the cover dissolves
  const [hold, setHold] = useState(false);
  // true from the guest's FIRST touch onward, forever — the idle rock is
  // an invitation to scratch; once that invitation has been accepted it
  // has nothing left to say, so it stays stopped for the rest of the
  // scratching session instead of resuming between individual strokes.
  // State, not a ref: it drives the render below, and refs must never
  // be read during render.
  const [everScratched, setEverScratched] = useState(false);

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

  // the silent `!canScratch` fallback dissolves the cover on the same path
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
    [sampleCoverage, finish],
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
        // hold, don't jerk: the surface freezes where it is under the
        // finger, while the cover dissolves, and — permanently, not just
        // per-stroke — once scratching has actually begun at all
        // (`everScratched`): the idle rock's job is inviting the FIRST
        // touch, not accompanying every subsequent one.
        animationPlayState: hold || fading || everScratched ? "paused" : "running",
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
          setEverScratched(true);
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
   The date as one cinematic frame — dynamic DOM, never an image. ONE
   designed lockup (weekday → day → month → year/time treated as a
   single composition, never positioned independently of each other),
   with a real, THREE-TIER hierarchy rather than "one big numeral, three
   equally-small labels":

     PRIMARY   the day numeral — a genuine embossed antique-gold HERO,
               Fraunces (`--font-couple`, this project's identity
               serif — the same face the couple names' union motif and
               the countdown numerals share).
     SECONDARY the month — Cormorant (`--font-engrave`), large and bold
               enough to be a real second voice, not a tiny caption;
               solid gold ink, no foil (the foil treatment is reserved
               for the one hero element, so it stays special).
     TERTIARY  weekday + year/time — Cormorant SC (`--font-invite-label`,
               this project's supporting small-caps voice), sized to be
               genuinely readable but in a warm neutral ink
               (`--text-secondary`/`--text-tertiary`), NOT gold — this
               is what actually creates hierarchy: three different tones
               instead of the same gold repeated four times.

   THE HERO NUMERAL's "engraved gold" treatment is built from THREE
   layered techniques, not one gradient + one shadow:
     1. a richer, higher-contrast vertical gradient fill (pale gold
        highlight at the very top → a deep bronze floor), the metal's
        own "catching the light" read;
     2. a stepped `text-shadow` — several 1px-apart, progressively
        deeper gold/bronze layers directly under the glyph — which is
        what actually reads as EXTRUDED depth (a real bevel), not just a
        gradient with a shadow behind it. `text-shadow` paints from the
        glyph's own outline regardless of `color:transparent`, so it
        keeps working alongside `background-clip:text`.
     3. one soft, wide `filter: drop-shadow` for the ambient "resting on
        the page" shadow, separating the whole numeral from the artwork
        beneath it.
   No backdrop-filter, no glow, no outline, no real 3-D transform —
   still entirely 2-D paint, just more of it, in the direction of an
   actual engraved medallion rather than flat gradient text. */
const HERO_GOLD_FILL =
  "linear-gradient(180deg, #fbeec3 0%, #eecf8e 20%, #cda158 44%, #a67c3a 68%, #8a642e 88%, #a2793a 100%)";
const HERO_GOLD_EXTRUDE =
  "0 1px 0 #e2bd7c, 0 2px 0 #d3aa66, 0 3px 0 #c39751, 0 4px 0 #b3843d, 0 5px 2px rgba(60,40,12,0.45)";
const HERO_GOLD_AMBIENT = "drop-shadow(0 10px 16px rgba(46,30,10,0.32))";

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
  const legible = "0 1px 2px rgba(38,26,14,0.2)";
  // TERTIARY tier — weekday + year/time: a warm neutral ink, not gold,
  // so the gold on the numeral (and, more plainly, the month) actually
  // reads as a hierarchy rather than "everything is gold".
  const tertiary: React.CSSProperties = {
    fontFamily: "var(--font-invite-label)",
    fontWeight: 500,
    color: "var(--text-secondary)",
    fontSize: "clamp(15px,4.1vw,19px)",
    letterSpacing: "0.26em",
    marginLeft: "0.26em",
    textTransform: "uppercase",
    textShadow: legible,
  };
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <span style={tertiary}>{weekday}</span>

      {/* PRIMARY — the hero numeral. See HERO_GOLD_* above for the
          three-layer embossed-gold recipe. Margins pulled in TIGHT this
          pass (was 2–6px / 3–7px): the previous, slightly looser spacing
          let the whole lockup grow taller than the panel's own vertical
          room on some viewports, pushing year/time down toward the
          decorative border — the fix is tighter binding between tiers,
          not a smaller numeral (the numeral is the one element
          explicitly NOT to shrink). */}
      <span
        style={{
          fontFamily: "var(--font-couple)",
          fontOpticalSizing: "auto",
          fontVariationSettings: '"opsz" 144, "SOFT" 40, "WONK" 1',
          fontWeight: 600,
          fontSize: "clamp(92px,32vw,156px)",
          letterSpacing: "0.005em",
          lineHeight: 0.82,
          // tight within the numeral's own unit — weekday → 4 → month
          // read as one composition, not three floating lines
          margin: "clamp(0px,0.2vh,3px) 0 clamp(0px,0.2vh,3px)",
          background: HERO_GOLD_FILL,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: HERO_GOLD_EXTRUDE,
          filter: HERO_GOLD_AMBIENT,
        }}
      >
        {day}
      </span>

      {/* SECONDARY — the month: large and bold enough to be a real
          second voice, solid gold ink (not the foil reserved for the
          hero), tracked out to sit under the numeral edge to edge.
          Tracking eased 0.2em → 0.15em — enough to still read as
          engraved stationery without the word visually splitting apart
          at this larger size. */}
      <span
        style={{
          fontFamily: "var(--font-engrave)",
          fontWeight: 700,
          color: "var(--gold-invite-deep)",
          fontSize: "clamp(24px,7vw,34px)",
          letterSpacing: "0.15em",
          marginLeft: "0.15em",
          textTransform: "uppercase",
          textShadow: "0 1px 0 rgba(255,250,236,0.4), 0 2px 4px rgba(60,42,16,0.22)",
        }}
      >
        {month}
      </span>

      <span style={{ ...tertiary, marginTop: "clamp(6px,1.2vh,10px)", color: "var(--text-tertiary)" }}>
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
      window.setTimeout(() => setSprinkle(false), 4600), // particles' own 4.5s fade has finished, unmount
    );
  }, [goPhase, reduceMotion]);

  /* the cover leaves the DOM only once it has fully dissolved */
  const handleCoverGone = useCallback(() => setCoverMounted(false), []);

  // the silent fallback for browsers with no canvas support — dissolves
  // the cover down the same path a scratch would, never cuts it away
  const forceReveal = useCallback(() => {
    setDismissCover(true);
    beginReveal();
  }, [beginReveal]);

  // `canScratch` is a one-time browser-capability check (see its own
  // `useMemo` above) and `beginReveal` itself already no-ops once phase
  // has left "sealed" — so this genuinely only ever needs to run once,
  // right after mount, exactly the "synchronize with an external system"
  // case an effect is for. Empty deps (was `[canScratch, phase,
  // forceReveal]`, which re-ran this effect on every later phase change
  // for no reason, even though the guard made every one of those re-runs
  // a no-op).
  useEffect(() => {
    if (!canScratch) forceReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* THIS SCENE'S OWN BACKGROUND — the dedicated Save the Date
          artwork (theme.assets.dateRevealPoster), inside the section, so
          the whole Date scene (background + scratch + date + countdown)
          scrolls away together as one unit. `object-fit: cover` height-
          matches this 768×1376 portrait art on every phone, which is
          what makes the dvh-based zone anchors below track the artwork's
          own measured geometry correctly (see the LAYOUT notes above the
          component). */}
      <img
        src={bgPoster}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover", objectPosition: "center", zIndex: 0 }}
      />

      {/* only a barely-there warm wash so the date and countdown stay
          legible — no panel, no card, no gradient that changes the
          painting. Centred a little lower than the viewport's own middle
          (48% not 44%) so it sits over the ornate panel AND reaches down
          toward the countdown band, rather than favouring the panel
          alone. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse 82% 60% at 50% 48%, rgba(252,248,240,0.24) 0%, rgba(252,248,240,0.05) 60%, transparent 82%)",
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
            "radial-gradient(ellipse 88% 62% at 50% 46%, rgba(255,239,209,0.34) 0%, rgba(255,232,196,0.10) 44%, transparent 74%)",
          opacity: bloom ? 1 : 0,
          transform: bloom ? "scale(1.035)" : "scale(1)",
          transition: bloom
            ? "opacity 0.7s ease, transform 2s ease"
            : "opacity 2.2s ease, transform 2.2s ease",
        }}
      />

      {/* THE CELEBRATION — a dense, two-sided burst of leaf/petal/
          confetti pieces releasing from the TOP-LEFT and TOP-RIGHT
          corners of the whole scene the instant the date is actually
          revealed (synced to the real scratch threshold via `sprinkle`,
          never to the section mounting or a timer). Positioned at the
          SECTION level, not inside the small scratch/date box, so the
          two bursts genuinely read as sweeping across the composition —
          and BEHIND the date/countdown content (zIndex 7, one below
          their own zIndex 8) so the pieces frame the reveal rather than
          sit on top of and obscure it. This is the invitation's ONE
          celebration system — it replaced two separate, much sparser
          effects (an ambient sprinkle + a small radial burst) that were
          really the same job done twice at too faint a scale. */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 7 }}>
        <CelebrationParticles active={sprinkle && !reduceMotion} count={180} durationMs={4500} />
      </div>

      {/* ── ZONE 1 — the ornate panel: scratch cover + revealed date ──
          Positioned at the panel's own measured interior (DATE_STAGE_*),
          not centred by maths and not sharing a flex group with the
          countdown below — the two live in genuinely different regions
          of the artwork, so they get independent anchors. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center justify-center"
        style={{
          top: `${DATE_STAGE_TOP_DVH}dvh`,
          bottom: `${DATE_STAGE_BOTTOM_DVH}dvh`,
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
            gesture, not a separate render.

            SIZE — the box is now SQUARE (see `COVER_W`/`COVER_H` above:
            the real asset is 500×500, not the previously-assumed
            1457×996 landscape). A square cover gives dramatically more
            HEIGHT than the old landscape shape did at the same width —
            which is what actually fixes "the date peeks out": a wide,
            short cover could never fully cover a tall weekday → numeral
            → month → year/time stack no matter how wide it got, while a
            square one comfortably clears it with real margin to spare.
            `80vw` is deliberately smaller in raw WIDTH than the previous
            (buggy, distorted) `94vw` — because the shape itself is now
            correct, this is a genuinely bigger, more prominent, fully-
            covering cover, not a step down. `52dvh`/`380px` stay only as
            ceilings for unusually wide/short viewports (a tablet in
            landscape); `vw` is the real governing term on every
            phone-shaped viewport, and (per the fix two passes ago) is
            required alongside a dvh term specifically because a
            dvh-only width can silently exceed the viewport's own WIDTH
            on typical phone aspect ratios. The scratch canvas itself
            needs no change for any of this: `ScratchCover` measures its
            own parent's live `offsetWidth/Height` (via `ResizeObserver`)
            and maps pointer coordinates through that same live size, so
            it is inherently resolution-independent — correct, and
            correctly square, at any stage size automatically. */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: "min(80vw, 52dvh, 380px)",
            transform: sealed ? "scale(0.982) translateY(4px)" : "scale(1) translateY(0)",
            transition: reduceMotion ? "none" : "transform 1.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
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
              {/* No instructional copy here by design — a painted gold
                  scratch-off surface is its own affordance. The only
                  fallback is silent: `!canScratch` (below) force-reveals
                  immediately for browsers without canvas support, so no
                  guest is ever actually stuck behind it. */}
              <ScratchCover
                onRevealStart={beginReveal}
                onCoverGone={handleCoverGone}
                dismiss={dismissCover}
                reduceMotion={reduceMotion}
                ariaLabel="Scratch the gold cover to reveal the wedding date"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── ZONE 2 — the quiet golden band: the countdown ─────────────
          Its OWN anchor (COUNTDOWN_*), well clear of the panel above and
          the diyas/urli bowls/flowers that start encroaching from the
          sides toward the bottom of this band — never inside the scratch
          panel, never over the decorative objects.

          Its SPACE is reserved from the start: the countdown component
          is mounted from the moment the section is live and simply held
          at zero opacity, so nothing shifts when the numbers arrive (that
          layout jump was the visible "cut").

          And it emerges ACROSS the reveal rather than after it: already
          half-lit while the cover dissolves, complete as the scene
          settles. One interpolation of opacity + a whisper of scale and
          travel — never a display swap, never a second entrance. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center justify-center"
        style={{
          top: `${COUNTDOWN_TOP_DVH}dvh`,
          bottom: `${COUNTDOWN_BOTTOM_DVH}dvh`,
          paddingLeft: "clamp(8px, 3vw, 20px)",
          paddingRight: "clamp(8px, 3vw, 20px)",
          zIndex: 8,
          userSelect: "none",
          WebkitUserSelect: "none",
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
