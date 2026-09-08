import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { EventData } from "../data/invitation";
import { parseEventDate } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { prefersReducedMotion } from "../lib/motion";
import {
  EventEmblem,
  HairRule,
  JharokhaArch,
  ThemeCorner,
  motifForEvent,
} from "./decor/Ornaments";

/**
 * The Celebrations — the events chapter as a reel of designed pages
 * from a single printed invitation suite.
 *
 * Each ceremony is ONE complete full-screen scene (data-reel-scene):
 * one viewport, one owned background, one composed page. Everything
 * belonging to a page — its paper/artwork, frame, ghost art, emblem,
 * title, date, venue, directions — lives inside its own 100dvh
 * section, so the whole scene moves together as one physical card
 * when the reel advances (see useReelPager in PublicInvitation).
 *
 * Every page is built like a leaf of luxury Indian wedding stationery,
 * not like a website block:
 *   · an inset double hairline frame with small corner florets — the
 *     printed card's edge
 *   · a whisper of the invitation's own jharokha arch rising behind
 *     the composition
 *   · a per-ceremony watercolour breath (sage / marigold / dusk blue /
 *     blush) and the ceremony's own line-drawn emblem as the anchor
 *   · the same three-voice type system as the Couple and Date scenes:
 *     Fraunces for the ceremony name, engraved Cormorant for the date,
 *     Cormorant SC small-caps for every label, italic Cormorant for
 *     the spoken detail
 *   · a refined, printed-ticket VIEW DIRECTIONS action
 *
 * The main wedding ceremony is the centrepiece: its page is set on the
 * invitation's own painted artwork (the frozen frame of the couple
 * film), so the strongest ceremony is also the most ceremonial page.
 *
 * The chapter opens with a single divider page ("The Celebrations")
 * so the Date scene hands off to a designed page before the
 * ceremonies begin.
 */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/* the printed card's ground — a warm ivory paper, the same family as
   the invitation's paper world; owned by each scene so it scrolls with it */
const PAPER =
  "linear-gradient(180deg, #fdfaf3 0%, #f7f0e1 55%, #eee4cb 100%)";

/* one quiet watercolour breath per ceremony — the palette bleeding onto
   the page, never a loud tint */
const ACCENTS: Record<string, string> = {
  mehendi: "rgba(138,164,120,0.16)", // soft sage
  haldi: "rgba(226,186,106,0.18)", // warm marigold
  sangeet: "rgba(124,154,192,0.15)", // dusk blue — the artwork's watercolour
  wedding: "rgba(200,170,110,0.16)",
  reception: "rgba(214,162,146,0.16)", // gentle blush
};
const accentFor = (motif: string) => ACCENTS[motif] ?? "rgba(200,170,110,0.14)";

/* a barely-there legibility wash over the wedding page's artwork —
   a warm veil hugging the composition, never a panel */
const ART_WASH =
  "radial-gradient(ellipse 88% 62% at 50% 44%, rgba(252,247,237,0.5) 0%, rgba(252,247,237,0.22) 52%, transparent 78%)";

function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
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

/* the printed page's shared envelope: an inset double hairline frame
   with a floret at each corner — the stationery "card edge" that every
   page of the chapter shares */
function PageEnvelope({ hero }: { hero?: boolean }) {
  const ink = hero ? "rgba(252,248,240,0.5)" : "var(--gold-invite)";
  const inset = "clamp(10px, 2.4vw, 18px)";
  const corners = ["tl", "tr", "br", "bl"] as const;
  const cornerPos: Record<(typeof corners)[number], CSSProperties> = {
    tl: { top: "clamp(8px, 2vw, 14px)", left: "clamp(8px, 2vw, 14px)" },
    tr: { top: "clamp(8px, 2vw, 14px)", right: "clamp(8px, 2vw, 14px)" },
    br: { bottom: "clamp(8px, 2vw, 14px)", right: "clamp(8px, 2vw, 14px)" },
    bl: { bottom: "clamp(8px, 2vw, 14px)", left: "clamp(8px, 2vw, 14px)" },
  };
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
      {/* outer hairline */}
      <div
        className="absolute"
        style={{ inset, border: "1px solid", borderColor: ink, opacity: hero ? 0.5 : 0.34 }}
      />
      {/* inner hairline, offset a breath */}
      <div
        className="absolute"
        style={{
          inset: `calc(${inset} + 5px)`,
          border: "1px solid",
          borderColor: ink,
          opacity: hero ? 0.3 : 0.16,
        }}
      />
      {corners.map((c) => (
        <span key={c} className="absolute" style={{ ...cornerPos[c], color: "var(--gold-invite)" }}>
          <ThemeCorner variant="floret" corner={c} size={24} />
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TitleScene — the chapter's divider page: a composed half-title
   leaf, not a header bar.
   ───────────────────────────────────────────────────────────── */
function TitleScene({ reduce }: { reduce: boolean }) {
  const { ref, inView } = useInView<HTMLElement>(0.3);
  const step = (i: number): CSSProperties => {
    if (reduce) return { opacity: 1 };
    return {
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 1s ${EASE} ${i * 0.12}s, transform 1s ${EASE} ${i * 0.12}s`,
    };
  };

  return (
    <section
      data-reel-scene
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* the page — paper ground + the arch's faint silhouette */}
      <div aria-hidden="true" className="absolute inset-0" style={{ zIndex: 0, background: PAPER }} />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none flex items-end justify-center"
        style={{ zIndex: 1, paddingBottom: "4dvh" }}
      >
        <JharokhaArch width={300} style={{ opacity: 0.055 }} />
      </div>
      <PageEnvelope />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{
          zIndex: 10,
          padding: "0 clamp(24px, 7vw, 48px)",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <span
          className="font-sc"
          style={{
            ...step(0),
            color: "var(--gold-invite-dim)",
            fontSize: "clamp(10px, 2.6vw, 12px)",
            letterSpacing: "0.5em",
            marginLeft: "0.5em",
            textTransform: "uppercase",
          }}
        >
          The Celebrations
        </span>
        <h2
          style={{
            ...step(1),
            marginTop: 16,
            fontFamily: "var(--font-couple)",
            fontVariationSettings: '"opsz" 96, "SOFT" 40, "WONK" 0',
            fontWeight: 500,
            color: "var(--text-primary)",
            fontSize: "clamp(34px, 9.6vw, 48px)",
            letterSpacing: "0.01em",
            lineHeight: 1.08,
          }}
        >
          Our Wedding Events
        </h2>
        <div style={{ ...step(2), marginTop: 26 }}>
          <HairRule width={160} node="diamond" style={{ opacity: 0.9 }} />
        </div>
        <p
          style={{
            ...step(3),
            marginTop: 22,
            maxWidth: 300,
            color: "var(--text-tertiary)",
            fontFamily: "'Cormorant', serif",
            fontStyle: "italic",
            fontSize: "clamp(12px, 3.2vw, 13.5px)",
            lineHeight: 1.6,
          }}
        >
          Four days of ceremony, music and love — we would be honoured by
          your presence at each.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Medallion — the ceremony emblem's delicate double-ring housing.
   ───────────────────────────────────────────────────────────── */
function Medallion({ children, hero }: { children: ReactNode; hero?: boolean }) {
  const size = hero ? "clamp(96px, 26dvh, 128px)" : "clamp(86px, 23dvh, 108px)";
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1px solid rgba(184,148,63,0.5)",
        color: "var(--gold-invite)",
        background: "rgba(252,249,242,0.4)",
      }}
      aria-hidden="true"
    >
      <span
        className="absolute"
        style={{
          inset: 5,
          borderRadius: "50%",
          border: "1px solid rgba(184,148,63,0.22)",
        }}
      />
      <span
        className="absolute"
        style={{
          inset: 9,
          borderRadius: "50%",
          border: "1px dashed rgba(184,148,63,0.28)",
        }}
      />
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   DirectionsAction — a refined printed-ticket action: a location
   pin in a whisper-thin circle + tracked small caps, sitting on a
   hairline underline. Understated, never a SaaS button.
   ───────────────────────────────────────────────────────────── */
function DirectionsAction({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open directions in Google Maps"
      className="directions-action"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 11,
        padding: "10px 2px 9px",
        color: "var(--gold-invite)",
        border: "none",
        borderBottom: "1px solid rgba(184,148,63,0.55)",
        background: "transparent",
        fontFamily: "var(--font-sc)",
        fontSize: "clamp(9px, 2.4vw, 10.5px)",
        fontWeight: 600,
        letterSpacing: "0.22em",
        marginLeft: "0.22em",
        textTransform: "uppercase",
        textDecoration: "none",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center"
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "1px solid rgba(184,148,63,0.45)",
          flex: "none",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </span>
      View Directions
    </a>
  );
}

/* ─────────────────────────────────────────────────────────────
   EventScene — one ceremony, one complete viewport, one designed
   page of the invitation suite.
   ───────────────────────────────────────────────────────────── */
function EventScene({
  event,
  index,
  hero,
  reduce,
}: {
  event: EventData;
  index: number;
  hero: boolean;
  reduce: boolean;
}) {
  const theme = useActiveTheme();
  const sceneRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const d = parseEventDate(event.date);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const dayNum = d.getDate();
  const motif = motifForEvent(event);
  const hasImage = !!event.image && imgOk;
  const chapter = ROMAN[index] ?? String(index + 1);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const step = (i: number): CSSProperties => {
    if (reduce) return { opacity: 1 };
    return {
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.95s ${EASE} ${i * 0.1}s, transform 0.95s ${EASE} ${i * 0.1}s`,
    };
  };

  return (
    <section
      data-reel-scene
      ref={sceneRef}
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* ── THIS PAGE'S OWN BACKGROUND — moves with the scene ──
          The wedding ceremony is set on the invitation's painted
          artwork; every other page is the printed card's paper with
          one watercolour breath of the painting's palette. */}
      {hero ? (
        <>
          <img
            src={theme.assets.wallpaperPoster}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover", objectPosition: "center", zIndex: 0 }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1, background: ART_WASH }}
          />
        </>
      ) : (
        <>
          <div aria-hidden="true" className="absolute inset-0" style={{ zIndex: 0, background: PAPER }} />
          {/* the ceremony's watercolour breath */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 1,
              background: `radial-gradient(ellipse 92% 58% at 50% 20%, ${accentFor(motif)} 0%, transparent 72%)`,
            }}
          />
          {/* the arch ghost — the invitation's own silhouette rising
              behind the composition */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none flex justify-center"
            style={{ zIndex: 1, opacity: 0.05 }}
          >
            <JharokhaArch width={280} />
          </div>
        </>
      )}

      {/* the stationery envelope — frame + corner florets */}
      <PageEnvelope hero={hero} />

      {/* ── the page's content ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{
          zIndex: 10,
          paddingTop: "max(clamp(48px, 9dvh, 72px), env(safe-area-inset-top))",
          paddingBottom: "max(clamp(48px, 9dvh, 72px), env(safe-area-inset-bottom))",
          paddingLeft: "clamp(22px, 6vw, 46px)",
          paddingRight: "clamp(22px, 6vw, 46px)",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <div className="flex flex-col items-center" style={{ width: "100%", maxWidth: 460 }}>
          {/* chapter mark — a whisper, flanked by hairlines */}
          <div
            className="flex items-center"
            style={{ ...step(0), gap: 10 }}
            aria-hidden="true"
          >
            <span style={{ width: 26, height: 1, background: "linear-gradient(90deg, transparent, var(--gold-invite))", opacity: 0.4 }} />
            <span
              style={{
                fontFamily: "'Cormorant', serif",
                fontStyle: "italic",
                color: "var(--gold-invite-dim)",
                fontSize: "clamp(10px, 2.6vw, 12px)",
                letterSpacing: "0.32em",
                marginLeft: "0.32em",
              }}
            >
              {chapter}
            </span>
            <span style={{ width: 26, height: 1, background: "linear-gradient(90deg, var(--gold-invite), transparent)", opacity: 0.4 }} />
          </div>

          {/* the visual anchor — the ceremony's emblem in its ring */}
          <div style={{ ...step(1), marginTop: "clamp(10px, 2.4dvh, 18px)" }}>
            {hasImage ? (
              <div style={{ padding: 5, border: "1px solid rgba(184,148,63,0.45)", background: "rgba(252,249,242,0.75)" }}>
                <img
                  src={event.image}
                  alt={event.name}
                  onError={() => setImgOk(false)}
                  loading="lazy"
                  style={{ display: "block", maxWidth: "min(52vw, 200px)", maxHeight: "clamp(90px, 22dvh, 140px)", objectFit: "contain" }}
                />
              </div>
            ) : (
              <Medallion hero={hero}>
                <EventEmblem motif={motif} size={hero ? 52 : 46} />
              </Medallion>
            )}
          </div>

          {/* the hero — the event name */}
          <h2
            style={{
              ...step(2),
              marginTop: "clamp(14px, 3.2dvh, 22px)",
              fontFamily: "var(--font-couple)",
              fontVariationSettings: hero
                ? '"opsz" 110, "SOFT" 55, "WONK" 0'
                : '"opsz" 96, "SOFT" 45, "WONK" 0',
              fontWeight: 500,
              color: "var(--text-primary)",
              fontSize: hero
                ? "clamp(36px, min(10.4vw, 12.5dvh), 52px)"
                : "clamp(31px, min(8.8vw, 10.5dvh), 43px)",
              letterSpacing: "0.01em",
              lineHeight: 1.06,
            }}
          >
            {event.name}
          </h2>

          {/* quiet rule */}
          <div style={{ ...step(3), marginTop: "clamp(11px, 2.4dvh, 17px)" }}>
            <HairRule width={hero ? 148 : 122} node="diamond" style={{ opacity: 0.9 }} />
          </div>

          {/* the date anchor — engraved, invitation-styled */}
          <div
            style={{
              ...step(4),
              marginTop: "clamp(13px, 2.8dvh, 20px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              className="font-sc"
              style={{
                color: "var(--gold-invite-dim)",
                fontSize: "clamp(8.5px, 2.3vw, 10px)",
                letterSpacing: "0.38em",
                marginLeft: "0.38em",
                textTransform: "uppercase",
              }}
            >
              {weekday}
            </span>
            <div className="flex items-baseline" style={{ gap: 11, marginTop: "clamp(5px, 1.2dvh, 9px)" }}>
              <span
                style={{
                  fontFamily: "var(--font-couple)",
                  fontVariationSettings: '"opsz" 96, "SOFT" 50, "WONK" 1',
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  fontSize: "clamp(30px, min(9.6vw, 11dvh), 42px)",
                  lineHeight: 0.9,
                }}
              >
                {dayNum}
              </span>
              <span
                className="font-sc"
                style={{
                  color: "var(--gold-invite)",
                  fontSize: "clamp(11px, 3.1vw, 13.5px)",
                  fontWeight: 600,
                  letterSpacing: "0.3em",
                  marginLeft: "0.3em",
                }}
              >
                {month}
              </span>
            </div>
            <span
              className="font-sc"
              style={{
                marginTop: "clamp(4px, 1dvh, 7px)",
                color: "var(--gold-invite)",
                fontSize: "clamp(10px, 2.8vw, 12px)",
                fontWeight: 600,
                letterSpacing: "0.24em",
                marginLeft: "0.24em",
                textTransform: "uppercase",
              }}
            >
              {event.time}
            </span>
          </div>

          {/* the venue — secondary but designed */}
          <div style={{ ...step(5), marginTop: "clamp(13px, 2.9dvh, 20px)" }}>
            <span
              className="font-sc"
              style={{
                color: "var(--text-secondary)",
                fontSize: "clamp(11px, 3vw, 13px)",
                fontWeight: 600,
                letterSpacing: "0.24em",
                marginLeft: "0.24em",
                textTransform: "uppercase",
              }}
            >
              {event.venue}
            </span>
            {event.address && (
              <span
                style={{
                  display: "block",
                  marginTop: 3,
                  color: "var(--text-tertiary)",
                  fontFamily: "'Cormorant', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(10.5px, 2.8vw, 12.5px)",
                }}
              >
                {event.address}
              </span>
            )}
          </div>

          {/* a short spoken detail — italic, quiet */}
          {event.description && (
            <p
              style={{
                ...step(6),
                marginTop: "clamp(11px, 2.4dvh, 16px)",
                maxWidth: 330,
                color: "var(--text-secondary)",
                fontFamily: "'Cormorant', serif",
                fontStyle: "italic",
                fontSize: "clamp(11.5px, 3.1vw, 13px)",
                lineHeight: 1.55,
              }}
            >
              {event.description}
            </p>
          )}

          {/* the action — refined and invitation-appropriate */}
          {event.directionsUrl && (
            <div style={{ ...step(7), marginTop: "clamp(15px, 3.4dvh, 22px)" }}>
              <DirectionsAction href={event.directionsUrl} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   EventsSection — the full-screen reel of pages: one divider page,
   then one complete scene per ceremony.
   ───────────────────────────────────────────────────────────── */
export default function EventsSection({ events }: { events: EventData[] }) {
  const reduce = useMemo(() => prefersReducedMotion(), []);

  if (!events || events.length === 0) return null;

  const heroIndex = events.findIndex((e) => motifForEvent(e) === "wedding");

  return (
    <>
      <TitleScene reduce={reduce} />
      {events.map((event, i) => (
        <EventScene
          key={event.id}
          event={event}
          index={i}
          hero={i === heroIndex}
          reduce={reduce}
        />
      ))}
    </>
  );
}
