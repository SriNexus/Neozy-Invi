import { useEffect, useRef, useState } from "react";
import type { VenueData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { JharokhaArch, Divider, ThemeCorner } from "./decor/Ornaments";
import ViewOnMapButton from "./ViewOnMapButton";

function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function VenueSection({
  venue,
  layout = "jharokha",
}: {
  venue: VenueData;
  layout?: "jharokha" | "minimal";
}) {
  const theme = useActiveTheme();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [imgOk, setImgOk] = useState(true);
  /* The section's ground: the theme's own venue artwork, unless the
     invitation carries a venue photograph of its own (an upload or a
     venue-specific image) — that always wins. Either way it sits behind
     the same legibility veil and the same ivory type, so the page reads
     as one designed composition. Theme-owned, never a path here. */
  const art = venue.image || theme.assets.venueImage;
  const hasImage = !!art && imgOk;
  const corners = ["tl", "tr", "br", "bl"] as const;

  return (
    <section
      data-reel-scene
      className="relative w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ height: "100dvh", padding: "clamp(24px,6vw,52px) clamp(20px,5vw,40px)" }}
    >
      {/* the section's artwork — full-bleed behind the content, moving
          with the section, with the warm-to-deep veil that keeps the
          ivory type legible on any painting */}
      {hasImage && (
        <div className="absolute inset-0">
          <img
            src={art}
            alt=""
            aria-hidden="true"
            onError={() => setImgOk(false)}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(28,20,12,0.42) 0%, rgba(28,20,12,0.66) 55%, rgba(20,14,8,0.86) 100%)",
            }}
          />
        </div>
      )}

      <div
        ref={ref}
        className="relative z-10 mx-auto text-center"
        style={{
          maxWidth: "min(92vw, 560px)",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(26px)",
          transition: "opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <span
          className="font-sc"
          style={{
            color: hasImage ? "var(--gold-soft)" : "var(--gold-invite-dim)",
            // kept above the parent-name baseline (13px), not just at it
            fontSize: "clamp(14px,3vw,16px)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
          }}
        >
          The Venue
        </span>

        {/* framed architectural composition */}
        <div
          className="relative mx-auto mt-6"
          style={{ maxWidth: "min(80vw, 440px)", padding: "clamp(16px,4vw,32px) clamp(20px,5vw,40px)" }}
        >
          <div
            className="absolute inset-0"
            style={{ border: `1px solid ${hasImage ? "rgba(227,205,154,0.5)" : "var(--gold-invite)"}`, opacity: 0.6 }}
          />
          {corners.map((c) => (
            <span
              key={c}
              className="absolute"
              style={{
                ...(c === "tl" ? { top: -8, left: -8 } : {}),
                ...(c === "tr" ? { top: -8, right: -8 } : {}),
                ...(c === "br" ? { bottom: -8, right: -8 } : {}),
                ...(c === "bl" ? { bottom: -8, left: -8 } : {}),
                color: hasImage ? "var(--gold-soft)" : "var(--gold-invite)",
              }}
            >
              <ThemeCorner variant={theme.motifs.corner} corner={c} size={30} />
            </span>
          ))}

          {!hasImage && layout === "jharokha" && (
            <div className="flex justify-center mb-2" style={{ color: "var(--gold-invite)" }}>
              <JharokhaArch width={78} style={{ opacity: 0.9 }} />
            </div>
          )}

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: hasImage ? "var(--ivory)" : "var(--text-primary)",
              fontSize: "clamp(24px,6.4vw,36px)",
              fontWeight: 500,
              lineHeight: 1.15,
            }}
          >
            {venue.name}
          </h2>

          <Divider
            emblem={theme.motifs.divider}
            width={110}
            className="my-3"
            style={{ color: hasImage ? "var(--gold-soft)" : "var(--gold-invite)" }}
          />

          <p
            style={{
              color: hasImage ? "var(--ivory-dim)" : "var(--text-secondary)",
              fontSize: "clamp(14px,3.4vw,15.5px)",
              fontStyle: "italic",
              lineHeight: 1.55,
            }}
          >
            {venue.address}
          </p>
          {venue.time && (
            <p
              className="font-sc mt-2"
              style={{
                color: hasImage ? "var(--gold-soft)" : "var(--gold-invite-dim)",
                // kept above the parent-name baseline (13px), not just at it
                fontSize: "clamp(14px,2.8vw,15.5px)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {venue.time}
            </p>
          )}
        </div>

        {(venue.directionsUrl || venue.mapUrl) && (
          <div className="mt-6">
            <ViewOnMapButton
              href={venue.directionsUrl || venue.mapUrl || "#"}
              ariaLabel={`View ${venue.name} on Google Maps`}
            />
          </div>
        )}
      </div>
    </section>
  );
}
