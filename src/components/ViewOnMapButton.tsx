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
 * the same hand, not a new UI language. Deliberately NOT a pill, NOT
 * glassmorphism (no backdrop-filter — this is paper/card stock, not
 * glass), NOT a bright SaaS CTA: a light, dimensional card the guest
 * immediately recognises as pressable, in an invitation that otherwise
 * has almost no button chrome at all.
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
        gap: 9,
        padding: "13px 24px",
        background: "linear-gradient(160deg, #fffdf8 0%, #f6efe1 100%)",
        border: "1px solid rgba(184,148,63,0.4)",
        borderRadius: "clamp(8px, 1.6vw, 12px)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -2px 3px rgba(120,92,45,0.1), 0 2px 4px rgba(60,42,16,0.14), 0 8px 16px rgba(60,42,16,0.2)",
        color: "#6b4b1e",
        fontFamily: "var(--font-sc)",
        // kept above the parent-name baseline (13px), not just at it
        fontSize: "clamp(14px, 2.8vw, 15.5px)",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textDecoration: "none",
        // a real, comfortable touch target — not just the visual text height
        minHeight: 44,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold-invite)"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      {label}
    </a>
  );
}
