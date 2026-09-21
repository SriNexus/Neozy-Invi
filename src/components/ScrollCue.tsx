import type { CSSProperties } from "react";

/**
 * ScrollCue — the invitation's one way of asking the guest to move on:
 * a thin-line downward arrow with a tracked wordmark ("Begin Our Story")
 * beneath it, carried on a soft pool of warm light. Arrow above, words
 * below, in the direction the guest should travel. No button chrome, no
 * pill, no card, no glass plate — the brightness is LIGHT, not a panel.
 *
 * Why it is built this way:
 *
 *   · VISIBILITY. The cue sits on the artwork's darkest band, over a
 *     full-screen painting, and it must be noticed without hunting for it.
 *     So the marks are ivory (the theme's own `--ivory`, near-white) with a
 *     tight dark shadow for the painting's LIGHT areas, plus a warm golden
 *     halo for its dark ones — readable on both.
 *   · THE LIGHT. A soft radial of warm cream sits behind the mark, so the
 *     cue floats on its own pool of light instead of being drawn onto the
 *     painting: it reads as a ray of light guiding the guest down rather
 *     than as a white blob or a plate. (It is deliberately NOT screen-
 *     blended: the cue sits inside its own stacking context, where a blend
 *     mode could not reach the painting anyway. The marks carry their own
 *     additive-looking glow through `drop-shadow`/`text-shadow`, which
 *     always survives stacking.)
 *   · THE BREATH. The light and the marks share one clock (3.2s): the mark
 *     brightens and drifts a few pixels down while its aura swells and
 *     fades — synchronised, slow enough to stay elegant, obvious enough to
 *     be noticed.
 *
 * It is purely visual: the reel pager owns the gesture, so nothing here
 * claims a touch or a wheel event.
 *
 * Reduced motion removes ONLY the animation — the cue stays fully visible,
 * bright and static. A scroll cue must never be hidden for reduced motion.
 */
export default function ScrollCue({
  shown,
  reduceMotion,
  label = "Begin Our Story",
  style,
}: {
  /** drives the wordmark's entrance and the pulse */
  shown: boolean;
  reduceMotion: boolean;
  label?: string;
  style?: CSSProperties;
}) {
  const glow =
    "drop-shadow(0 1px 2px rgba(24,16,8,0.62)) drop-shadow(0 0 8px rgba(255,228,168,0.72))";

  return (
    <span
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...style,
      }}
    >
      {/* THE LIGHT — the pool of warm cream the whole mark floats on. It
          is light, not a panel: no edge, no border, no blur plate. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "clamp(160px, 44dvw, 220px)",
          height: "clamp(110px, 24dvh, 150px)",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(closest-side, rgba(255,252,242,0.46) 0%, rgba(255,241,210,0.26) 46%, rgba(255,236,196,0) 80%)",
          opacity: shown ? 1 : 0,
          transition: reduceMotion ? "none" : "opacity 1.4s ease",
          pointerEvents: "none",
          animation:
            shown && !reduceMotion ? "scrollCueAura 3.2s ease-in-out infinite" : "none",
        }}
      />

      {/* the mark itself — arrow above, wordmark below, one breath */}
      <span
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation:
            shown && !reduceMotion ? "scrollCuePulse 3.2s ease-in-out infinite" : "none",
        }}
      >
        <span style={{ display: "block", lineHeight: 0, filter: glow }}>
          <svg width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden="true">
            {/* a thin drawn arrow: shaft, then the head — nothing chunky */}
            <path
              d="M11 2.5v17"
              stroke="var(--ivory, #f7f2e6)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M4.4 13.4L11 20l6.6-6.6"
              stroke="var(--ivory, #f7f2e6)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span
          style={{
            display: "block",
            marginTop: "clamp(7px, 1.1dvh, 11px)",
            fontFamily: "var(--font-invite-label)",
            fontWeight: 600,
            color: "var(--ivory, #f7f2e6)",
            // global floor: no readable text anywhere below the
            // parent-name baseline (13px) — this label used to sit
            // under it at the narrowest widths
            fontSize: "clamp(13px, 3vw, 15px)",
            letterSpacing: "0.32em",
            // tracking compensation — the established label pattern
            marginLeft: "0.32em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            // a tight dark offset for the painting's light areas, then a warm
            // halo so the words carry their own light on the dark ones
            textShadow:
              "0 1px 2px rgba(24,16,8,0.62), 0 0 14px rgba(255,224,150,0.6)",
            // the entrance — a whisper of a rise, one beat after the arrow
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0)" : "translateY(6px)",
            transition: reduceMotion
              ? "none"
              : "opacity 0.9s ease, transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
            transitionDelay: reduceMotion || !shown ? "0ms" : "0.28s",
          }}
        >
          {label}
        </span>
      </span>
    </span>
  );
}
