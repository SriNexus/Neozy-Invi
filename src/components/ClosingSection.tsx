import { useEffect, useRef, useState } from "react";
import type { CoupleData, ClosingData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { Divider, AmpersandOrnament, JharokhaArch, HairRule } from "./decor/Ornaments";

/* the couple's names here — the invitation's literal closing words —
   previously sat in flat `--text-primary` ink, the one remaining place
   in the whole invitation where the names weren't given the same
   dimensional gold the couple scene, the welcome text and the Save the
   Date all use. This is the SAME light gold-gradient recipe already
   used for "Welcome To Our" in CoupleIntro.tsx — reused rather than
   invented, so the closing page reads as the same hand finishing the
   same book, restrained enough for the italic display serif here
   (the heavier, stepped-extrusion recipe is reserved for hero moments
   like the couple's own Telma wordmark and the Save the Date numeral). */
const CLOSING_NAME_GRADIENT: React.CSSProperties = {
  background: "linear-gradient(180deg, #f3e3c0 0%, #d9bd72 45%, #a8863c 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter:
    "drop-shadow(0 1px 0 rgba(255,250,236,0.45)) drop-shadow(0 2px 4px rgba(60,42,16,0.32))",
};

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

export default function ClosingSection({
  couple,
  closing,
}: {
  couple: CoupleData;
  closing: ClosingData;
}) {
  const theme = useActiveTheme();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [artOk, setArtOk] = useState(true);

  const step = (i: number): React.CSSProperties => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 0.9s ease ${0.15 * i}s, transform 0.9s ease ${0.15 * i}s`,
  });

  return (
    <section
      data-reel-scene
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ height: "100dvh", padding: "clamp(28px,6vw,52px) clamp(24px,6vw,48px)" }}
    >
      {/* The closing page's artwork — the invitation's COVER, closing the
          book it opened. Full-bleed behind the farewell and moving with
          the section, under a warm stationery veil rather than a dark
          overlay: the painting stays a presence at the edges while the
          printed ink stays exactly as readable as it is on paper. (The
          Venue page uses the same artwork-plus-veil idea on a deep
          palette; this page stays in the light, so the invitation ends
          on its own paper world.) */}
      {artOk && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <img
            src={theme.assets.closingImage}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setArtOk(false)}
            className="w-full h-full"
            style={{ objectFit: "cover", objectPosition: "center 38%" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 112% 78% at 50% 46%, rgba(253,250,243,0.94) 0%, rgba(250,245,233,0.88) 52%, rgba(236,226,203,0.93) 100%)",
            }}
          />
        </div>
      )}

      <div ref={ref} className="relative z-10 text-center flex flex-col items-center" style={{ maxWidth: 420 }}>
        {/* a small kicker announcing this as the invitation's own closing
            page, the same "tracked label" voice every other section
            opens with (The Venue / Our Story / The Celebrations) — the
            one thing missing before, which made the page read as simply
            "another section" rather than a deliberate final page. */}
        <span
          className="font-sc"
          style={{
            ...step(0),
            color: "var(--gold-invite-dim)",
            fontSize: "clamp(15px, 3.2vw, 17px)",
            letterSpacing: "0.4em",
            marginLeft: "0.4em",
            textTransform: "uppercase",
          }}
        >
          With Love
        </span>

        <div className="mt-3" style={{ ...step(1), color: "var(--gold-invite)" }}>
          <JharokhaArch width={68} style={{ opacity: 0.7 }} />
        </div>

        {/* PASS — the couple's names are the invitation's literal last
            words and should read as the strongest visual element on the
            page, per an explicit "main couple names must be the
            strongest visual element" direction — bumped substantially
            (30–46px → 40–62px) rather than nudged, since a modest
            increase here would still have left the closing page's own
            hero moment reading as an afterthought next to how large
            names get treated everywhere else in the invitation.

            NAME ORDER — canonical guest-facing order is Gunjan (bride,
            `couple.name2`) then Abhay (groom, `couple.name1`), matching
            CoupleIntro.tsx's own render order (bride's NameBlock first,
            groom's second). This page previously rendered name1 then
            name2 — i.e. Abhay then Gunjan — inconsistent with
            CoupleIntro. The underlying `name1`/`name2` data fields keep
            their existing semantic roles (groom/bride, tied to
            groomParents/brideParents) unchanged; only the DISPLAY order
            here was swapped to match. */}
        <h2
          className="mt-5"
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(40px,11.5vw,62px)",
            fontWeight: 500,
            lineHeight: 1.1,
            ...CLOSING_NAME_GRADIENT,
            ...step(2),
          }}
        >
          {couple.name2}
        </h2>
        <div className="my-1" style={{ color: "var(--gold-invite)", ...step(2) }}>
          <AmpersandOrnament size={20} />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(40px,11.5vw,62px)",
            fontWeight: 500,
            lineHeight: 1.1,
            ...CLOSING_NAME_GRADIENT,
            ...step(3),
          }}
        >
          {couple.name1}
        </h2>

        <Divider emblem={theme.motifs.divider} width={130} className="my-5" style={step(4)} />

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            color: "var(--text-secondary)",
            fontSize: "clamp(17px,4.2vw,21px)",
            lineHeight: 1.55,
            maxWidth: 360,
            ...step(4),
          }}
        >
          {closing.message}
        </p>

        {closing.familyMessage && (
          <p
            className="font-sc mt-4"
            style={{
              color: "var(--gold-invite-dim)",
              // kept comfortably above the parent-name baseline (13px)
              fontSize: "clamp(14px,3vw,16px)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              ...step(5),
            }}
          >
            {closing.familyMessage}
          </p>
        )}

        {/* the invitation's own last mark — a single small hairline with
            a diamond node, the visual "full stop" after the last word.
            Restrained on purpose: this closes the book, it doesn't open
            a new section. */}
        <div className="mt-5" style={{ ...step(6), opacity: 0.6 }}>
          <HairRule width={56} node="diamond" />
        </div>
      </div>
    </section>
  );
}
