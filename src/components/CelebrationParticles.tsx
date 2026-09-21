import { useMemo } from "react";
import type { CSSProperties } from "react";

/**
 * The date-reveal celebration — a dense, two-sided burst of small leaf/
 * petal/confetti-like pieces releasing from the TOP-LEFT and TOP-RIGHT
 * corners of the scene the instant the wedding date is actually
 * revealed, spreading inward and down across the composition. Modelled
 * on a real luxury-wedding-confetti reference: many small pieces, a
 * restrained warm palette (antique gold, champagne, muted rose, soft
 * blush, ivory, terracotta, a soft muted red), varied shapes/sizes/
 * speeds/rotation — never a uniform shower of identical dots.
 *
 * This REPLACES the invitation's earlier two separate, much sparser
 * effects (a 6-fleck ambient sprinkle + a 14-spark radial burst from the
 * date's own centre) with ONE system, because both were really the same
 * job — "mark the reveal" — done twice, at a scale that read as too
 * faint against the artwork. There is only one particle system in the
 * project now; if a future scene needs a celebration, extend THIS
 * component rather than adding a second one.
 *
 * Deliberately positioned BEHIND the date/countdown content (see the
 * zIndex where this mounts in DateReveal.tsx) — the pieces frame the
 * reveal, they never sit on top of and obscure the numerals.
 *
 * PASS 2 — "far too weak" fix: the first version released every piece
 * from one exact top-corner pixel with fixed PX travel distances (max
 * ~300px), which on a tall phone covered a small fraction of the screen
 * and read as a faint puff, not a celebration. Three changes fixed this,
 * together reading as an order of magnitude stronger without becoming
 * fireworks:
 *   1. DENSITY — default count roughly tripled, and each corner's
 *      release point is now jittered across a small strip of the top
 *      edge (not one pixel), so the burst visibly ORIGINATES from a
 *      region, not a point.
 *   2. REACH — travel distance is now expressed in `vw`/`vh` (percentage
 *      of the actual viewport) instead of fixed pixels, so the sweep
 *      genuinely spans the composition on every phone size instead of a
 *      constant, easily-dwarfed pixel amount.
 *   3. DURATION — individual pieces now stagger their release and run
 *      longer (see `makePieces`), so motion keeps visibly developing for
 *      ~1.5–2s after the initial release before the whole system fades,
 *      instead of the celebration reading as one instantaneous flash.
 */

type Shape = "petal" | "leaf" | "confetti" | "dot";
type Side = "left" | "right";

interface ConfettiPiece {
  id: number;
  side: Side;
  shape: Shape;
  color: string;
  size: number;
  /** release point, jittered along a strip of the top edge rather than
   *  one fixed pixel — vw from the piece's own side edge, vh from top */
  startXVw: number;
  startYVh: number;
  /** travel distance in vw (horizontal) / vh (vertical) — percentage of
   *  the real viewport, so the sweep scales with the actual screen
   *  instead of a constant, easily-dwarfed pixel amount */
  dx: number;
  dy: number;
  rotateFrom: number;
  rotateTo: number;
  delay: number;
  duration: number;
}

/** a restrained wedding-stationery palette — no neon, no saturated
 *  rainbow, nothing that reads as a website celebration. */
const PALETTE = [
  "rgba(184,148,63,0.92)", // antique gold
  "rgba(214,188,120,0.88)", // champagne
  "rgba(196,140,132,0.85)", // muted rose
  "rgba(232,190,178,0.85)", // soft blush
  "rgba(247,238,222,0.9)", // warm ivory
  "rgba(173,120,86,0.82)", // terracotta / brown
  "rgba(178,92,82,0.8)", // soft muted red
  "rgba(224,201,150,0.85)", // pale gold
];

const SHAPES: Shape[] = ["petal", "leaf", "confetti", "dot"];

/** one piece per side, released from a small strip of that top corner
 *  outward + downward. Angles are measured from the horizontal at that
 *  corner (0° = straight out along the top edge, 90° = straight down),
 *  biased toward the 25–130° range so the two bursts read as sweeping
 *  down and inward across the scene rather than skimming flat along the
 *  top edge. Distances are in `vw`/`vh` (see the file header, PASS 2),
 *  and delay/duration are staggered widely so the sweep keeps visibly
 *  developing for ~1.5–2s rather than resolving in one instant. */
function makePieces(perSide: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  let id = 0;
  (["left", "right"] as const).forEach((side) => {
    const outward = side === "left" ? 1 : -1;
    for (let i = 0; i < perSide; i++) {
      const angle = (25 + Math.random() * 105) * (Math.PI / 180);
      const dist = 30 + Math.random() * 52; // vw-scale magnitude
      const spin = 90 + Math.random() * 300;
      pieces.push({
        id: id++,
        side,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        size: 6 + Math.random() * 17,
        startXVw: Math.random() * 15,
        startYVh: -2 + Math.random() * 9,
        dx: outward * Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist * 1.15 + Math.random() * 9,
        rotateFrom: Math.random() * 360,
        rotateTo: (Math.random() < 0.5 ? -1 : 1) * spin,
        delay: Math.random() * 0.9,
        duration: 2.3 + Math.random() * 1.9,
      });
    }
  });
  return pieces;
}

function PetalShape({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      <ellipse cx="5" cy="5" rx="3.5" ry="5" fill={color} transform="rotate(15 5 5)" />
    </svg>
  );
}

function LeafShape({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 10 15" aria-hidden="true">
      <path d="M5 0 C 9 4, 9 11, 5 15 C 1 11, 1 4, 5 0 Z" fill={color} />
    </svg>
  );
}

function ConfettiShape({ color, size }: { color: string; size: number }) {
  return (
    <div
      style={{
        width: size * 1.4,
        height: size * 0.55,
        borderRadius: 1,
        background: color,
      }}
    />
  );
}

export default function CelebrationParticles({
  active = false,
  count = 180,
  durationMs = 4500,
}: {
  active?: boolean;
  /** TOTAL pieces across both corners (split evenly). Dense by design —
   *  this is a real celebration, not a sprinkle. */
  count?: number;
  durationMs?: number;
}) {
  const pieces = useMemo(() => makePieces(Math.ceil(count / 2)), [count]);

  if (!active) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ animation: `celebrationFade ${durationMs}ms ease-out forwards` }}
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={
            {
              top: `${p.startYVh.toFixed(1)}vh`,
              left: p.side === "left" ? `${p.startXVw.toFixed(1)}vw` : "auto",
              right: p.side === "right" ? `${p.startXVw.toFixed(1)}vw` : "auto",
              animation: `celebrationConfetti ${p.duration}s cubic-bezier(0.16,1,0.3,1) ${p.delay}s both`,
              willChange: "transform, opacity",
              "--conf-dx": `${p.dx.toFixed(1)}vw`,
              "--conf-dy": `${p.dy.toFixed(1)}vh`,
              "--conf-rot-from": `${p.rotateFrom.toFixed(0)}deg`,
              "--conf-rot-to": `${p.rotateTo.toFixed(0)}deg`,
            } as CSSProperties
          }
        >
          {p.shape === "petal" && <PetalShape color={p.color} size={p.size} />}
          {p.shape === "leaf" && <LeafShape color={p.color} size={p.size} />}
          {p.shape === "confetti" && <ConfettiShape color={p.color} size={p.size} />}
          {p.shape === "dot" && (
            <div
              style={{
                width: p.size * 0.7,
                height: p.size * 0.7,
                borderRadius: "50%",
                background: p.color,
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
