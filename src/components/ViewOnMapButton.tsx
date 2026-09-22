/**
 * ViewOnMapButton — a small, restrained, unmistakably-clickable action,
 * shared by the Venue section and every event page's directions link.
 *
 * Previously each of those two places drew its own text-like link
 * (an underline on hover, no real surface) — reported as "looks too
 * much like ordinary text." This gives both the SAME premium "raised
 * ivory card" treatment already established for the Countdown's own
 * boxes elsewhere in the invitation (a warm ivory gradient surface,
 * layered inset+outer shadows for real dimensional depth, a hairline
 * antique-gold border) — reused rather than invented, so this reads as
 * the same hand, not a new UI language.
 *
 * PASS — shape corrected to a horizontal oval/capsule (full `999px`
 * radius, clamped by the browser to the true half-height at any size,
 * plus deliberately wider-than-tall padding) rather than a small fixed
 * corner radius, which at larger sizes read as a rounded rectangle
 * rather than an "engraved stationery plaque."
 *
 * PASS 2 — roughly halved: reported as "still much too large," visually
 * dominating the event card's own type and crowding the white/negative
 * space it sits in. Every dimension was cut, not just the text: padding
 * `11px 26px → 6px 14px`, `minWidth 150 → 84`, `minHeight 44 → 26`,
 * icon `13px → 10px`, gap `8 → 5`, and the box-shadow's own blur/spread
 * values scaled down with it (a shadow sized for the old, larger button
 * would itself have read as "bulky" on the new small one). Text drops
 * BELOW this invitation's general 14px body-text floor on purpose — the
 * floor exists for reading copy, and this is a three-word UI action
 * label, not prose; `clamp(11px, 2vw, 12px)` stays legible at this
 * scale specifically because the label keeps its bold weight and
 * tracked uppercase treatment, which is what carries the smallest
 * comfortably-readable UI labels elsewhere on the web to begin with.
 * Still deliberately NOT glassmorphism (no backdrop-filter — this is
 * paper/card stock, not glass) and NOT a bright CTA.
 *
 * Hover/press states live in `index.css` (`.view-on-map-button`) as
 * plain CSS pseudo-classes — no JS state needed for a rest/hover/active
 * treatment this simple.
 */
export default function ViewOnMapButton({
  href,
  label = "View on Map",
  ariaLabel,
}: {
  href: string;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel ?? `${label} in Google Maps`}
      className="view-on-map-button inline-flex items-center justify-center"
      style={{
        gap: 5,
        // wide-relative-to-height padding — still the thing that reads
        // as a horizontal OVAL rather than a rounded square, just at a
        // much smaller absolute scale than before
        padding: "6px 14px",
        minWidth: 84,
        maxWidth: "100%",
        background: "linear-gradient(160deg, #fffdf8 0%, #f4ecda 100%)",
        border: "1.25px solid rgba(184,148,63,0.55)",
        // a full capsule — the browser clamps this to the real
        // half-height at any size, so it stays a true oval, never a
        // rounded square
        borderRadius: 999,
        // scaled down with the button itself — the old shadow's reach
        // (up to 16px blur) was tuned for a button roughly twice this
        // size and read as heavy/bulky once the surface shrank under it
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 2px rgba(120,92,45,0.12), 0 1px 3px rgba(60,42,16,0.16), 0 3px 8px rgba(60,42,16,0.18)",
        color: "#5c3f16",
        fontFamily: "var(--font-sc)",
        // deliberately below the 14px body-text floor — see header
        // comment: a short, bold, tracked UI label, not reading copy
        fontSize: "clamp(11px, 2vw, 12px)",
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        textDecoration: "none",
        whiteSpace: "nowrap",
        minHeight: 26,
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold-invite)"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      {label}
    </a>
  );
}
