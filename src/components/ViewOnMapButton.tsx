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
 * PASS — shape corrected to a horizontal oval/capsule: an earlier
 * version used a small `8–12px` corner radius, which at this button's
 * proportions (comfortably wide, comfortably tall) read as a squared-
 * off rectangle rather than the "engraved stationery plaque" this was
 * meant to be, and its footprint pushed against the edge of the
 * artwork's own narrow text-safe column. Fixed by (1) a full capsule
 * radius (999px — clamped by the browser to the actual half-height, so
 * this works at any size) and (2) proportions that are DELIBERATELY
 * wider relative to their height (generous horizontal padding, modest
 * vertical padding) so the shape itself reads as a horizontal oval, not
 * a generic SaaS pill — the surface/shadow/typography treatment below
 * (paper-stock gradient, layered dimensional shadow, small-caps serif
 * label) is what keeps a capsule shape from reading as "SaaS," not the
 * corner radius. Still deliberately NOT glassmorphism (no
 * backdrop-filter — this is paper/card stock, not glass) and NOT a
 * bright CTA: a light, dimensional plaque the guest immediately
 * recognises as pressable, in an invitation that otherwise has almost
 * no button chrome at all.
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
        gap: 8,
        // wide horizontal padding, modest vertical padding — the actual
        // thing that makes this read as a horizontal OVAL rather than a
        // rounded rectangle, independent of the corner radius itself
        padding: "11px 26px",
        minWidth: 150,
        maxWidth: "100%",
        background: "linear-gradient(160deg, #fffdf8 0%, #f4ecda 100%)",
        border: "1.5px solid rgba(184,148,63,0.55)",
        // a full capsule — the browser clamps this to the real
        // half-height at any size, so it stays a true oval, never a
        // rounded square
        borderRadius: 999,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 3px rgba(120,92,45,0.12), 0 2px 5px rgba(60,42,16,0.16), 0 8px 16px rgba(60,42,16,0.2)",
        color: "#5c3f16",
        fontFamily: "var(--font-sc)",
        // kept comfortably above the parent-name baseline (13px)
        fontSize: "clamp(14px, 2.6vw, 15px)",
        fontWeight: 700,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        textDecoration: "none",
        whiteSpace: "nowrap",
        // a real, comfortable touch target — not just the visual text height
        minHeight: 44,
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold-invite)"
        strokeWidth="1.9"
        aria-hidden="true"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      {label}
    </a>
  );
}
