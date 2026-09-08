import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Countdown from "./Countdown";
import CelebrationParticles from "./CelebrationParticles";

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
  onComplete,
  ariaLabel,
}: {
  onFirstScratch: () => void;
  /** fired the instant the ~50% threshold is crossed — the parent starts
   *  the warm bloom + sprinkles NOW, in parallel with the cover fade, so
   *  there is no visible cut between states */
  onRevealStart: () => void;
  onComplete: () => void;
  ariaLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const done = useRef(false);
  const ready = useRef(false);
  const started = useRef(false);
  const lastSample = useRef(0);
  const baseOpaque = useRef(0); // opaque sample count of the freshly-painted cover
  const [fading, setFading] = useState(false);

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
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
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
      // if the cover can't load, don't trap the guest behind it
      img.onerror = () => { if (!cancelled) onComplete(); };
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
  }, [onComplete]);

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

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onRevealStart(); // bloom + sprinkles begin immediately …
    setFading(true); // … while the cover dissolves (opacity 1 → 0) …
    window.setTimeout(onComplete, 900); // … and the date settles under it
  }, [onComplete, onRevealStart]);

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

  const toCanvas = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  return (
    <canvas
      ref={canvasRef}
      className="scratch-surface absolute inset-0 w-full h-full"
      style={{
        touchAction: "none",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.9s ease",
        filter: "drop-shadow(0 6px 20px rgba(60,42,16,0.28))",
      }}
      onPointerDown={(e) => {
        if (done.current) return;
        e.preventDefault();
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
      onPointerUp={() => { drawing.current = false; last.current = null; }}
      onPointerCancel={() => { drawing.current = false; last.current = null; }}
      role="img"
      aria-label={ariaLabel}
    />
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
  const [started, setStarted] = useState(false);
  const [showAssist, setShowAssist] = useState(false);
  const [entered, setEntered] = useState(reduceMotion);
  const [bloom, setBloom] = useState(false); // brief warm light across the art
  const [sprinkle, setSprinkle] = useState(false); // brief celebratory particles
  const sectionRef = useRef<HTMLElement | null>(null);
  const bloomTimers = useRef<number[]>([]);

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
  // the scratch threshold is crossed, it runs in parallel with the cover
  // dissolving: warm bloom + sprinkles begin, the date settles, then the
  // light recedes — slowly, like sunlight passing across the painting —
  // so the countdown eases in at NORMAL, full brightness. The bloom never
  // "switches off" (its exit is a long, gentle ease that finishes just as
  // the countdown completes); the final settled scene carries no dimming
  // layer of any kind — it is simply the artwork at rest.
  const beginReveal = useCallback(() => {
    if (phase !== "sealed") return;
    bloomTimers.current.forEach((t) => clearTimeout(t));
    bloomTimers.current = [];
    if (reduceMotion) {
      setPhase("settled");
      return;
    }
    setBloom(true);
    setSprinkle(true);
    bloomTimers.current.push(
      window.setTimeout(() => setPhase("revealed"), 850), // cover dissolved → date settles in
      window.setTimeout(() => setBloom(false), 1600), // light begins to recede (2.2s gentle exit)
      window.setTimeout(() => setPhase("settled"), 2300), // countdown eases in at full brightness
      window.setTimeout(() => setSprinkle(false), 2600), // particles done, unmount
    );
  }, [phase, reduceMotion]);

  const complete = useCallback(() => setPhase("revealed"), []);

  const forceReveal = useCallback(() => {
    setStarted(true);
    beginReveal();
  }, [beginReveal]);

  useEffect(() => {
    if (!canScratch && phase === "sealed") forceReveal();
  }, [canScratch, phase, forceReveal]);

  useEffect(
    () => () => { bloomTimers.current.forEach((t) => clearTimeout(t)); },
    [],
  );

  const sealed = phase === "sealed";
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
          gold and blush, short-lived, well clear of the date. Not confetti. */}
      <CelebrationParticles active={sprinkle && !reduceMotion} count={6} durationMs={1700} />

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
          <DateFace day={day} month={month} year={year} weekday={weekday} time={time} />

          {sealed && canScratch && (
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
                onComplete={complete}
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
            generous gap below the date, subordinate to it */}
        <div
          className="flex flex-col items-center"
          style={{
            marginTop: "clamp(28px, 6.5dvh, 56px)",
            opacity: settled ? 1 : 0,
            transform: settled ? "translateY(0)" : "translateY(10px)",
            transition: reduceMotion ? "none" : "opacity 1.1s ease 0.2s, transform 1.1s ease 0.2s",
          }}
        >
          <Countdown targetDate={weddingDate} visible={visible && settled} />
        </div>
      </div>
    </section>
  );
}
