import { useEffect, useRef, useState } from "react";
import type { VenueData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { JharokhaArch, Divider, ThemeCorner } from "./decor/Ornaments";

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
  const hasImage = !!venue.image && imgOk;
  const corners = ["tl", "tr", "br", "bl"] as const;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: "92dvh", padding: "clamp(64px,12vw,110px) clamp(20px,5vw,40px)" }}
    >
      {/* photographic backdrop, if supplied */}
      {hasImage && (
        <div className="absolute inset-0">
          <img
            src={venue.image}
            alt=""
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
            fontSize: "clamp(10px,2.5vw,12px)",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
          }}
        >
          The Venue
        </span>

        {/* framed architectural composition */}
        <div
          className="relative mx-auto mt-8"
          style={{ maxWidth: "min(80vw, 440px)", padding: "clamp(24px,6vw,44px) clamp(20px,5vw,40px)" }}
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
            <div className="flex justify-center mb-3" style={{ color: "var(--gold-invite)" }}>
              <JharokhaArch width={132} style={{ opacity: 0.9 }} />
            </div>
          )}

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: hasImage ? "var(--ivory)" : "var(--text-primary)",
              fontSize: "clamp(26px,7vw,40px)",
              fontWeight: 500,
              lineHeight: 1.15,
            }}
          >
            {venue.name}
          </h2>

          <Divider
            emblem={theme.motifs.divider}
            width={120}
            className="my-4"
            style={{ color: hasImage ? "var(--gold-soft)" : "var(--gold-invite)" }}
          />

          <p
            style={{
              color: hasImage ? "var(--ivory-dim)" : "var(--text-secondary)",
              fontSize: "clamp(13px,3.4vw,15px)",
              fontStyle: "italic",
              lineHeight: 1.7,
            }}
          >
            {venue.address}
          </p>
          {venue.time && (
            <p
              className="font-sc mt-3"
              style={{
                color: hasImage ? "var(--gold-soft)" : "var(--gold-invite-dim)",
                fontSize: "clamp(10px,2.6vw,12px)",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
              }}
            >
              {venue.time}
            </p>
          )}
        </div>

        {(venue.directionsUrl || venue.mapUrl) && (
          <a
            href={venue.directionsUrl || venue.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-7 py-3"
            style={{
              border: `1px solid ${hasImage ? "rgba(227,205,154,0.5)" : "var(--gold-invite)"}`,
              color: hasImage ? "var(--gold-soft)" : "var(--gold-invite)",
              fontFamily: "var(--font-sc)",
              fontSize: "clamp(10px,2.6vw,12px)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
              background: hasImage ? "rgba(20,14,8,0.25)" : "rgba(252,249,242,0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            Find the way
          </a>
        )}
      </div>
    </section>
  );
}
