import { useEffect, useRef, useState } from "react";
import type { CoupleData, ClosingData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { Divider, AmpersandOrnament, JharokhaArch } from "./decor/Ornaments";

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
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ minHeight: "96dvh", padding: "clamp(72px,15vw,120px) clamp(24px,6vw,48px)" }}
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
        <div style={{ ...step(0), color: "var(--gold-invite)" }}>
          <JharokhaArch width={96} style={{ opacity: 0.7 }} />
        </div>

        <h2
          className="mt-6"
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            color: "var(--text-primary)",
            fontSize: "clamp(32px,9vw,52px)",
            fontWeight: 500,
            lineHeight: 1.12,
            ...step(1),
          }}
        >
          {couple.name1}
        </h2>
        <div className="my-2" style={step(2)}>
          <AmpersandOrnament size={20} />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            color: "var(--text-primary)",
            fontSize: "clamp(32px,9vw,52px)",
            fontWeight: 500,
            lineHeight: 1.12,
            ...step(2),
          }}
        >
          {couple.name2}
        </h2>

        <Divider emblem={theme.motifs.divider} width={150} className="my-8" style={step(3)} />

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            color: "var(--text-secondary)",
            fontSize: "clamp(15px,4vw,19px)",
            lineHeight: 1.75,
            maxWidth: 340,
            ...step(3),
          }}
        >
          {closing.message}
        </p>

        {closing.familyMessage && (
          <p
            className="font-sc mt-8"
            style={{
              color: "var(--gold-invite-dim)",
              // global floor: never below the parent-name baseline (13px)
              fontSize: "clamp(13px,2.8vw,14.5px)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              ...step(4),
            }}
          >
            {closing.familyMessage}
          </p>
        )}
      </div>
    </section>
  );
}
