import { useMemo } from "react";
import type { CSSProperties } from "react";

/**
 * Premium celebration particles. Two restrained modes, one system:
 *
 *   "fall"  (default) — gold/blush petals and confetti drifting down
 *           from above; the invitation's original sprinkle.
 *   "burst" — a small radial spray of gold sparks out of the centre of
 *           the container, for the instant the wedding date is revealed.
 *
 * Both are lightweight CSS-only animations that auto-fade after the
 * specified duration. Neither is confetti-cannon fireworks: the marks
 * are tiny, the palette is the invitation's own gold on cream, and the
 * whole thing is over in a couple of seconds.
 */

interface Particle {
  id: number;
  left: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  type: "petal" | "confetti" | "dot";
  color: string;
}

const COLORS = [
  "rgba(184,148,63,0.7)",   // gold
  "rgba(212,184,106,0.6)",  // light gold
  "rgba(228,180,160,0.6)",  // blush
  "rgba(200,160,120,0.5)",  // warm
  "rgba(180,140,100,0.4)",  // muted gold
  "rgba(240,220,190,0.5)",  // cream
];

function makeParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const typeRand = Math.random();
    particles.push({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 2,
      size: typeRand < 0.4 ? 6 + Math.random() * 6 : typeRand < 0.7 ? 4 + Math.random() * 4 : 2 + Math.random() * 3,
      rotation: Math.random() * 360,
      type: typeRand < 0.4 ? "petal" : typeRand < 0.7 ? "confetti" : "dot",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }
  return particles;
}

function PetalShape({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10">
      <ellipse
        cx="5"
        cy="5"
        rx="3.5"
        ry="5"
        fill={color}
        transform="rotate(15 5 5)"
      />
    </svg>
  );
}

function ConfettiShape({ color, size }: { color: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size * 0.6,
        borderRadius: 1,
        background: color,
      }}
    />
  );
}

/* spark tints for the burst — printed-invitation golds on cream only:
   no candy confetti, no neon. */
const BURST_COLORS = [
  "rgba(184,148,63,0.92)",  // gold
  "rgba(212,184,106,0.88)", // light gold
  "rgba(246,232,204,0.90)", // cream highlight
  "rgba(196,158,74,0.80)",  // deep gold
];

interface Spark {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

/**
 * The burst — sparkles radiating from the middle of the container.
 * Distribution is even around the circle with a little jitter (light,
 * not a fountain), and the vertical travel is compressed so the sparks
 * stay inside the arch's clear channel and never drift down towards the
 * countdown band. They travel only a short way outward and fade in/out
 * as they go.
 */
function makeSparks(count: number): Spark[] {
  const sparks: Spark[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
    const dist = 58 + Math.random() * 62;
    sparks.push({
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.58,
      size: 2.4 + Math.random() * 2.6,
      delay: Math.random() * 0.3,
      duration: 1.2 + Math.random() * 0.8,
      color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
    });
  }
  return sparks;
}

export default function CelebrationParticles({
  active = false,
  count = 24,
  durationMs = 4000,
  mode = "fall",
}: {
  active?: boolean;
  count?: number;
  durationMs?: number;
  /** "fall" = the drifting petals (default); "burst" = the reveal's
   *  radial sparkle spray from the centre of the container */
  mode?: "fall" | "burst";
}) {
  const particles = useMemo(() => makeParticles(count), [count]);
  const sparks = useMemo(() => makeSparks(count), [count]);

  if (!active) return null;

  if (mode === "burst") {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 30,
          // sparks may travel past the container; the page clips the rest
          overflow: "visible",
          animation: `celebrationFade ${durationMs}ms ease-out forwards`,
        }}
        aria-hidden="true"
      >
        {sparks.map((s) => (
          <span
            key={s.id}
            className="absolute"
            style={
              {
                left: "50%",
                top: "50%",
                width: s.size,
                height: s.size,
                // centred on the origin without a transform, so the
                // keyframe owns transform entirely
                marginLeft: -s.size / 2,
                marginTop: -s.size / 2,
                background: s.color,
                boxShadow: "0 0 3px rgba(232,200,132,0.45)",
                animation: `celebrationBurst ${s.duration}s cubic-bezier(0.16,1,0.3,1) ${s.delay}s both`,
                willChange: "transform, opacity",
                "--burst-dx": `${s.dx.toFixed(1)}px`,
                "--burst-dy": `${s.dy.toFixed(1)}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: 30,
        animation: `celebrationFade ${durationMs}ms ease-out forwards`,
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.left,
            top: "-20px",
            animation: `celebrationFall ${p.duration}s ease-in ${p.delay}s both`,
            willChange: "transform, opacity",
          }}
        >
          {p.type === "petal" && <PetalShape color={p.color} size={p.size} />}
          {p.type === "confetti" && <ConfettiShape color={p.color} size={p.size} />}
          {p.type === "dot" && (
            <div
              style={{
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: p.color,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
