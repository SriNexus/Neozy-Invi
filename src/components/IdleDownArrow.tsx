import type { CSSProperties } from "react";

/**
 * IdleDownArrow — the invitation's global "you can keep going" cue: a
 * small, mostly-still downward arrow that appears only once a guest has
 * been idle on the current scene for a while (see `useIdleScrollCue`),
 * with one gentle spring settle every few seconds rather than a
 * continuous bounce. Arrow only — no wordmark, no button chrome, no
 * circle backing. It is a visual cue, not a second navigation surface:
 * `pointer-events: none` and `aria-hidden` so it can never steal a tap
 * or a gesture from the reel pager underneath it.
 *
 * Tuned for the invitation's light/cream paper scenes (Events, RSVP):
 * an antique-gold stroke with a warm top highlight and a soft dark
 * shadow gives it real dimension against cream — an embossed-metal
 * read, not just "brighter."  `tone="onDark"` reuses ScrollCue's own
 * ivory-on-warm-halo treatment for a dark scene, if one is ever wired
 * in later.
 */
export default function IdleDownArrow({
  shown,
  reduceMotion,
  tone = "onLight",
  style,
}: {
  shown: boolean;
  reduceMotion: boolean;
  tone?: "onLight" | "onDark";
  style?: CSSProperties;
}) {
  const stroke = tone === "onLight" ? "#8a6224" : "var(--ivory, #f7f2e6)";
  const filter =
    tone === "onLight"
      ? "drop-shadow(0 1px 0 rgba(255,250,235,0.7)) drop-shadow(0 2px 3px rgba(70,48,16,0.4))"
      : "drop-shadow(0 1px 2px rgba(24,16,8,0.62)) drop-shadow(0 0 8px rgba(255,228,168,0.72))";

  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        bottom: "max(clamp(12px, 2.6dvh, 24px), env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
        zIndex: 20,
        lineHeight: 0,
        pointerEvents: "none",
        opacity: shown ? 1 : 0,
        transition: reduceMotion ? "none" : "opacity 0.9s ease",
        filter,
        animation: shown && !reduceMotion ? "idleArrowSpring 3.6s ease-in-out infinite" : "none",
        ...style,
      }}
    >
      <svg width="20" height="24" viewBox="0 0 22 26" fill="none">
        <path d="M11 2.5v17" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M4.4 13.4L11 20l6.6-6.6"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
