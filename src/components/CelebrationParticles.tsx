import { useMemo } from "react";

/**
 * Premium celebration particles — gold/blush petals and confetti
 * drifting downward from above. Lightweight CSS-only animation.
 * Auto-fades after the specified duration.
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

export default function CelebrationParticles({
  active = false,
  count = 24,
  durationMs = 4000,
}: {
  active?: boolean;
  count?: number;
  durationMs?: number;
}) {
  const particles = useMemo(() => makeParticles(count), [count]);

  if (!active) return null;

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
