import type { CSSProperties } from "react";

/**
 * Theme 01 decorative language — a single family of hand-drawn gold
 * ornaments (florets, creepers, emblems, arches) shared by every
 * section so the invitation reads as one designed object, not a stack
 * of unrelated components. All strokes inherit `currentColor` unless
 * noted, so callers set the gold via `color`.
 *
 * No emoji, no gradients-as-decoration, no rounded-card chrome.
 */

const gold = "var(--gold-invite)";
const goldDim = "var(--gold-invite-dim)";

/* ─────────────────────────────────────────────────────────────
   Corner floret — one quadrant of a framed composition.
   Rotate via the `corner` prop.
   ───────────────────────────────────────────────────────────── */
export function CornerFloret({
  corner = "tl",
  size = 46,
  style,
}: {
  corner?: "tl" | "tr" | "br" | "bl";
  size?: number;
  style?: CSSProperties;
}) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[corner];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      style={{ transform: `rotate(${rot}deg)`, ...style }}
      aria-hidden="true"
    >
      <path
        d="M2 2 L2 20 M2 2 L20 2"
        stroke={gold}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M8 8 C 8 22, 18 30, 30 30 M8 8 C 22 8, 30 18, 30 30"
        stroke={goldDim}
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M8 8 C 14 14, 16 10, 22 12 C 18 16, 22 20, 20 26 C 16 22, 12 24, 8 8 Z"
        fill={gold}
        opacity="0.5"
      />
      <circle cx="30" cy="30" r="2" fill={gold} />
      <circle cx="6" cy="24" r="1.3" fill={gold} opacity="0.7" />
      <circle cx="24" cy="6" r="1.3" fill={gold} opacity="0.7" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Arabesque corner — Theme 02 variant.
   ───────────────────────────────────────────────────────────── */
export function CornerArabesque({
  corner = "tl",
  size = 46,
  style,
}: {
  corner?: "tl" | "tr" | "br" | "bl";
  size?: number;
  style?: CSSProperties;
}) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[corner];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      style={{ transform: `rotate(${rot}deg)`, ...style }}
      aria-hidden="true"
    >
      <path
        d="M4 4 C 30 4, 30 30, 4 30 M4 4 C 4 30, 30 30, 30 4"
        stroke={gold}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path d="M4 4 L4 16 M4 4 L16 4" stroke={gold} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="17" cy="17" r="2.2" fill={gold} opacity="0.65" />
    </svg>
  );
}

export function ThemeCorner({
  variant,
  ...rest
}: {
  variant: "floret" | "peacock" | "arabesque";
  corner?: "tl" | "tr" | "br" | "bl";
  size?: number;
  style?: CSSProperties;
}) {
  if (variant === "arabesque") return <CornerArabesque {...rest} />;
  return <CornerFloret {...rest} />;
}

/* ─────────────────────────────────────────────────────────────
   Hair rule — a single tapered gold hairline with an optional
   centre node. The quiet connective tissue of the invitation:
   under the Ganesha crest, flanking the month wordmark, carrying
   the wedding-hands between the two names. Never a border.
   ───────────────────────────────────────────────────────────── */
export function HairRule({
  width = 40,
  node = "none",
  tone = gold,
  className = "",
  style,
}: {
  width?: number | string;
  node?: "none" | "dot" | "diamond";
  tone?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width, ...style }}
      aria-hidden="true"
    >
      <span
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${tone} 60%, ${tone})`,
          opacity: 0.55,
        }}
      />
      {node !== "none" && (
        <span
          style={{
            flex: "none",
            width: node === "diamond" ? 4 : 3,
            height: node === "diamond" ? 4 : 3,
            margin: "0 5px",
            background: tone,
            transform: node === "diamond" ? "rotate(45deg)" : "none",
            borderRadius: node === "dot" ? "50%" : 0,
            opacity: 0.9,
          }}
        />
      )}
      <span
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(90deg, ${tone}, ${tone} 40%, transparent)`,
          opacity: 0.55,
        }}
      />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section divider — a centered emblem flanked by tapering rules.
   ───────────────────────────────────────────────────────────── */
export function Divider({
  emblem = "lotus",
  width = 168,
  className = "",
  style,
}: {
  emblem?: "lotus" | "star" | "geometric";
  width?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ gap: 12, color: gold, ...style }}
      aria-hidden="true"
    >
      <span
        style={{
          width: width / 2 - 18,
          height: 1,
          background: "linear-gradient(90deg, transparent, currentColor)",
        }}
      />
      <Emblem kind={emblem} size={16} tone="current" />
      <span
        style={{
          width: width / 2 - 18,
          height: 1,
          background: "linear-gradient(90deg, currentColor, transparent)",
        }}
      />
    </div>
  );
}

export function Emblem({
  kind = "lotus",
  size = 16,
  tone = "gold",
  style,
}: {
  kind?: "lotus" | "star" | "geometric";
  size?: number;
  tone?: "gold" | "current";
  style?: CSSProperties;
}) {
  const c = tone === "current" ? "currentColor" : gold;
  if (kind === "star") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill={c} style={style} aria-hidden="true">
        <path d="M10 0 L12.4 7 L20 10 L12.4 13 L10 20 L7.6 13 L0 10 L7.6 7 Z" />
      </svg>
    );
  }
  if (kind === "geometric") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.1" style={style} aria-hidden="true">
        <path d="M10 1 L19 10 L10 19 L1 10 Z" />
        <path d="M10 5.5 L14.5 10 L10 14.5 L5.5 10 Z" fill={c} opacity="0.4" />
      </svg>
    );
  }
  // lotus
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 24 16" fill="none" style={style} aria-hidden="true">
      <path d="M12 15 C 12 8, 12 4, 12 2 C 13 6, 14 11, 12 15 Z" fill={c} opacity="0.9" />
      <path d="M12 15 C 8 10, 5 7, 3 5 C 6 9, 7 13, 12 15 Z" fill={c} opacity="0.6" />
      <path d="M12 15 C 16 10, 19 7, 21 5 C 18 9, 17 13, 12 15 Z" fill={c} opacity="0.6" />
      <path d="M12 15 C 6 13, 2 12, 0 11 C 4 15, 8 15.5, 12 15 Z" fill={c} opacity="0.4" />
      <path d="M12 15 C 18 13, 22 12, 24 11 C 20 15, 16 15.5, 12 15 Z" fill={c} opacity="0.4" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Ampersand ornament for couple names.
   ───────────────────────────────────────────────────────────── */
export function AmpersandOrnament({ size = 30 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 10, color: gold }}
      aria-hidden="true"
    >
      <span style={{ width: 26, height: 1, background: `linear-gradient(90deg, transparent, ${gold})` }} />
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: size,
          fontStyle: "italic",
          lineHeight: 1,
          color: gold,
        }}
      >
        &amp;
      </span>
      <span style={{ width: 26, height: 1, background: `linear-gradient(90deg, ${gold}, transparent)` }} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Event emblems — one line-drawn emblem per function. No emoji.
   ───────────────────────────────────────────────────────────── */
export function EventEmblem({
  motif,
  size = 34,
}: {
  motif: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none" as const,
    stroke: gold,
    strokeWidth: 1.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (motif) {
    case "mehendi": // henna leaf / paisley
      return (
        <svg {...common}>
          <path d="M16 28 C 8 24, 6 14, 12 6 C 18 12, 20 20, 16 28 Z" />
          <path d="M16 24 C 13 20, 13 14, 15 10" />
          <path d="M15 16 L12 14 M15 19 L12 18 M15 13 L18 11" />
        </svg>
      );
    case "haldi": // sun / marigold
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="6" />
          <path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M24.5 7.5l-2 2M9.5 22.5l-2 2" />
        </svg>
      );
    case "sangeet": // dholak / notes
      return (
        <svg {...common}>
          <ellipse cx="16" cy="16" rx="7" ry="9" />
          <path d="M9 16h14M11 10c3 2 7 2 10 0M11 22c3-2 7-2 10 0" />
        </svg>
      );
    case "wedding": // twin rings
      return (
        <svg {...common}>
          <circle cx="13" cy="18" r="6" />
          <circle cx="19" cy="18" r="6" />
          <path d="M13 12l1.5-3h3L19 12" />
        </svg>
      );
    case "reception": // toasting glasses
      return (
        <svg {...common}>
          <path d="M9 6l4 9v9M9 6l-1 4a5 5 0 005 5M9 24h8" transform="translate(-1 0)" />
          <path d="M23 6l-4 9v9M23 6l1 4a5 5 0 01-5 5" />
        </svg>
      );
    case "blessing": // diya lamp
      return (
        <svg {...common}>
          <path d="M6 20 C 10 26, 22 26, 26 20 C 22 22, 10 22, 6 20 Z" fill={gold} opacity="0.35" />
          <path d="M16 6 C 14 9, 14 12, 16 13 C 18 12, 18 9, 16 6 Z" fill={gold} opacity="0.6" />
        </svg>
      );
    default: // lotus / generic ceremony
      return (
        <svg {...common}>
          <path d="M16 26 C 16 16, 16 10, 16 6 C 18 12, 20 20, 16 26 Z" />
          <path d="M16 26 C 9 20, 6 14, 5 10 C 9 16, 11 22, 16 26 Z" />
          <path d="M16 26 C 23 20, 26 14, 27 10 C 23 16, 21 22, 16 26 Z" />
        </svg>
      );
  }
}

/** Infer a motif key from an event when none is set (no emoji fallback). */
export function motifForEvent(e: { motif?: string; id?: string; name?: string }): string {
  if (e.motif) return e.motif;
  const hay = `${e.id ?? ""} ${e.name ?? ""}`.toLowerCase();
  for (const k of ["mehendi", "haldi", "sangeet", "reception", "wedding", "blessing"]) {
    if (hay.includes(k)) return k;
  }
  if (hay.includes("engage") || hay.includes("roka")) return "wedding";
  if (hay.includes("tilak") || hay.includes("puja") || hay.includes("pooja")) return "blessing";
  return "lotus";
}

/* ─────────────────────────────────────────────────────────────
   Jharokha arch — architectural silhouette for the venue's
   no-photo fallback.
   ───────────────────────────────────────────────────────────── */
export function JharokhaArch({
  width = 260,
  style,
}: {
  width?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={width}
      height={width * 1.25}
      viewBox="0 0 200 250"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M30 240 L30 90 Q30 30 100 18 Q170 30 170 90 L170 240"
        stroke={gold}
        strokeWidth="1.4"
      />
      <path
        d="M44 240 L44 92 Q44 44 100 34 Q156 44 156 92 L156 240"
        stroke={goldDim}
        strokeWidth="0.9"
        opacity="0.7"
      />
      <path
        d="M58 240 L58 96 Q58 58 100 50 Q142 58 142 96 L142 240"
        stroke={goldDim}
        strokeWidth="0.7"
        opacity="0.45"
      />
      <path d="M100 34 L100 8 M92 16 L100 8 L108 16" stroke={gold} strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="100" cy="120" r="3" fill={gold} />
      <path d="M20 240 H180" stroke={gold} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Ambient floating light particles — controlled, few.
   ───────────────────────────────────────────────────────────── */
export function AmbientParticles({
  count = 12,
  seed = 1,
  className = "",
}: {
  count?: number;
  seed?: number;
  className?: string;
}) {
  const rand = mulberry32(seed);
  const parts = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${6 + rand() * 88}%`,
    top: `${15 + rand() * 75}%`,
    size: 2 + rand() * 3,
    delay: rand() * 9,
    duration: 8 + rand() * 7,
    maxOpacity: 0.12 + rand() * 0.22,
    dx: -18 + rand() * 36,
    dy: -(50 + rand() * 110),
    dx2: -14 + rand() * 28,
    dy2: -(110 + rand() * 90),
  }));
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      {parts.map((p) => (
        <span
          key={p.id}
          className="ambient-particle"
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              "--p-max-o": p.maxOpacity,
              "--p-dx": `${p.dx}px`,
              "--p-dy": `${p.dy}px`,
              "--p-dx2": `${p.dx2}px`,
              "--p-dy2": `${p.dy2}px`,
              animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
