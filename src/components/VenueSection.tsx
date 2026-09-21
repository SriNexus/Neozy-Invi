import { useEffect, useRef, useState } from "react";
import type { VenueData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { JharokhaArch, Divider } from "./decor/Ornaments";
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

/**
 * PASS — major recomposition. The previous design put the venue photo
 * (or its absence) full-bleed behind EVERYTHING, under a heavy dark
 * veil, with ivory text floating on top — the classic "text over a
 * darkened photo" pattern. Two real problems with that: (1) the photo
 * was reduced to a mere backdrop rather than getting to be "visual
 * storytelling" in its own right, and (2) ivory-on-photo forced a
 * contrast compromise that never fully solved the readability
 * complaint no matter how large the text got.
 *
 * Fixed by giving the image and the information their own distinct
 * ZONES instead of stacking one on the other: an upper region where
 * the photo (or, absent one, an enlarged architectural illustration)
 * is the actual subject, and a lower, SOLID ivory information panel —
 * dark ink on light paper, the same high-contrast pairing used
 * everywhere else in this invitation — holding venue name, address,
 * time and the map action. The panel's own content determines its
 * height (not a forced percentage), which in practice lands close to
 * the ~40% the brief asks for without hard-coding it. A thin gold
 * hairline at the seam is the only "border" — a printed caption plate
 * at the foot of a page, not a floating card.
 */
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
     venue-specific image) — that always wins. Theme-owned, never a
     path here. NOTE: Theme 1 currently ships no venue photograph
     (`theme.assets.venueImage` is intentionally empty — see themes.ts)
     and the default invitation data carries no `venue.image` either,
     so `hasImage` is false today; the fallback (an enlarged
     JharokhaArch standing in for the photo's visual role) is what
     actually renders until a real venue photo is supplied. */
  const art = venue.image || theme.assets.venueImage;
  const hasImage = !!art && imgOk;

  return (
    <section
      data-reel-scene
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* ── UPPER ZONE — the venue's visual storytelling ────────────
          Full-bleed photo when one exists; otherwise a warm paper
          ground with a genuinely large architectural illustration
          standing in the photo's role, never a token "ghost." Either
          way this is the FIRST thing the eye reads on this page. */}
      <div className="absolute inset-0" aria-hidden="true">
        {hasImage ? (
          <>
            <img
              src={art}
              alt=""
              onError={() => setImgOk(false)}
              className="w-full h-full object-cover"
            />
            {/* only a soft fade where the image meets the panel below —
                not a veil across the whole photograph, since the photo
                no longer needs to carry legible text over itself */}
            <div
              className="absolute inset-x-0 bottom-0"
              style={{
                height: "22%",
                background: "linear-gradient(180deg, transparent 0%, rgba(20,14,8,0.5) 100%)",
              }}
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 100% 70% at 50% 38%, rgba(200,170,110,0.16) 0%, transparent 72%)",
              }}
            />
            {layout === "jharokha" && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "8dvh" }}>
                <JharokhaArch width={220} style={{ color: "var(--gold-invite)", opacity: 0.85 }} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── LOWER ZONE — the information panel: a solid, opaque plate,
          dark ink on light paper (the same high-contrast pairing used
          everywhere else in this invitation), sized by its own content
          rather than a forced percentage. ── */}
      <div
        ref={ref}
        className="absolute inset-x-0 bottom-0 text-center"
        style={{
          background: "linear-gradient(180deg, #fdfaf3 0%, #f7f0e1 55%, #eee4cb 100%)",
          borderTop: "1px solid rgba(184,148,63,0.55)",
          boxShadow: "0 -14px 30px rgba(30,20,10,0.22)",
          padding: "clamp(20px,4.5vw,32px) clamp(24px,6vw,44px) max(clamp(20px,4.5vw,32px), env(safe-area-inset-bottom))",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(26px)",
          transition: "opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: "min(90vw, 460px)" }}>
          <span
            className="font-sc"
            style={{
              color: "var(--gold-invite-dim)",
              fontSize: "clamp(15px,3.2vw,17px)",
              letterSpacing: "0.4em",
              marginLeft: "0.4em",
              textTransform: "uppercase",
            }}
          >
            The Venue
          </span>

          <h2
            className="mt-2"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: "var(--text-primary)",
              fontSize: "clamp(28px,7.4vw,40px)",
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
            style={{ color: "var(--gold-invite)" }}
          />

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "clamp(15px,3.6vw,17px)",
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
                color: "var(--gold-invite-dim)",
                fontSize: "clamp(14px,2.8vw,15.5px)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {venue.time}
            </p>
          )}

          {(venue.directionsUrl || venue.mapUrl) && (
            <div className="mt-4">
              <ViewOnMapButton
                href={venue.directionsUrl || venue.mapUrl || "#"}
                ariaLabel={`View ${venue.name} on Google Maps`}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
