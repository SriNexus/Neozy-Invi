import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { EventData } from "../data/invitation";
import type { EventWallpaper } from "../data/themes";
import { parseEventDate } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { prefersReducedMotion } from "../lib/motion";
import { EventEmblem, HairRule, JharokhaArch, ThemeCorner } from "./decor/Ornaments";
import { motifForEvent } from "../lib/eventMotif";
import ViewOnMapButton from "./ViewOnMapButton";
import IdleDownArrow from "./IdleDownArrow";
import { useIdleScrollCue } from "../lib/useIdleScrollCue";

/**
 * The Celebrations — the events chapter as a reel of designed pages
 * from a single printed invitation suite.
 *
 * Each ceremony is ONE complete full-screen scene (data-reel-scene):
 * one viewport, one owned background, one composed page, moving
 * together as one physical card when the reel advances (see
 * useReelPager in PublicInvitation).
 *
 * REDESIGNED around the Theme 1 event artwork (measured directly from
 * the shipped files — see the pixel-sampling notes below, not guessed):
 * every ceremony's `eventBackgrounds` image is a flat-lay photograph of
 * an ornamental gold-framed PLAQUE with the ceremony's own name already
 * engraved into a ribbon banner near its top, and a large blank cream
 * panel beneath that banner — the artwork's OWN designed text-safe
 * area. Measured across all five shipped images (haldi/mehendi/sangeet/
 * wedding/reception, each 768×1376): that blank panel sits at a
 * consistent ≈37–72% of image height and ≈16–83% of image width. Since
 * `object-fit: cover` height-matches this portrait art on every phone
 * (identical principle to the Couple scene's video — see brain.md
 * "Artwork geometry facts"), a vertical image-% maps directly to the
 * same dvh-%, so the content wrapper below is positioned at ≈39.5–68dvh
 * (a deliberately conservative INTERSECTION of all five images' own
 * measured ranges, not the loosest one).
 *
 * The artwork therefore now supplies the ceremony's name/title, its
 * ornamental frame and its cultural identity — the old code-generated
 * title + circular emblem/medallion that used to sit above the name is
 * GONE, along with the per-page double-hairline card envelope (the
 * photograph already has its own elaborate gold framing; a second frame
 * drawn over it was pure repetition). The ONLY thing the app still
 * overlays is what genuinely needs to stay dynamic/editable: DATE and
 * VENUE, placed inside that measured blank panel, sized and coloured to
 * read as ink printed on the same cream card the ceremony name already
 * sits on — same three-voice type system as the Couple/Date scenes
 * (Fraunces for the day numeral, Cormorant SC small-caps for labels).
 *
 * A page with no matching theme artwork (not something any shipped
 * event hits today, but the data model allows a custom event with no
 * motif match) falls back to the earlier plain-paper treatment — its
 * own title text, the invitation's own arch ghost, and the printed
 * card envelope — since there is no photograph to supply a name there.
 *
 * The chapter opens with a single divider page ("The Celebrations")
 * so the Date scene hands off to a designed page before the
 * ceremonies begin.
 */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* the day numeral's embossed-gold ink — the SAME three-layer recipe
   (gradient fill + stepped extrusion shadow + soft ambient shadow)
   already used for the Save the Date's hero numeral and the welcome
   text's hero word, scaled down for this numeral's smaller size (its
   extrusion steps match CoupleIntro's "WEDDING" word, the closest match
   in font size). Reused rather than reinvented, so a guest who has
   already seen the Date scene reads this as the same premium hand,
   not a different treatment — this is what actually took the section
   from "flat text over a photo" to "designed page," not a size bump. */
const DAY_GOLD_FILL =
  "linear-gradient(180deg, #fbeec3 0%, #eecf8e 20%, #cda158 44%, #a67c3a 68%, #8a642e 88%, #a2793a 100%)";
const DAY_GOLD_EXTRUDE =
  "0 1px 0 #e2bd7c, 0 2px 0 #d3aa66, 0 3px 0 #c39751, 0 3px 1px rgba(60,40,12,0.4)";
const DAY_GOLD_AMBIENT = "drop-shadow(0 5px 9px rgba(46,30,10,0.3))";

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
/* the watercolour breath above is now only applied on the plain-paper
   fallback — a page WITH real theme artwork is already a professionally
   colour-graded photograph and does not need a wash laid over it (the
   old legibility veil this file used to layer on top of the artwork,
   `ART_WASH`, is removed for the same reason — see EventScene). */

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

/* ─────────────────────────────────────────────────────────────
   EventBackdrop — THIS ceremony's artwork, as the page's full-screen
   background layer.

   Deliberately the simplest thing that can work: ONE painting, rendered
   statically, always mounted, with no state, no timers, no crossfade
   buffers and no mounting/unmounting on scroll. The artwork a ceremony is
   given in `ThemeAssets.eventBackgrounds` is therefore the artwork its page
   always shows — on every render, in every build, and for as long as the
   guest is parked on the page. (An earlier per-ceremony carousel is what
   made the background appear to change or reset underneath the guest.)

   It sits at the back of its own 100dvh scene, so it moves with that page
   exactly like the page's own type does — and it slides under the warm
   `ART_WASH` veil plus the ceremony's watercolour breath, which is what
   keeps the printed dark ink readable on the painting. Nothing here is
   interactive (`pointer-events: none`, no handlers), so every vertical
   swipe still belongs to useReelPager.
   ───────────────────────────────────────────────────────────── */
function EventBackdrop({ wallpaper }: { wallpaper: EventWallpaper }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* the printed card's paper, underneath — a slow or failed image can
          never leave a blank page */}
      <div className="absolute inset-0" style={{ background: PAPER }} />
      {/* eager on purpose: this image IS the page, so it must already be
          decoded by the time the pager lands on the scene — never a paper
          flash. Once loaded it is never unmounted, so it is always there. */}
      <img
        src={wallpaper.ground}
        alt=""
        decoding="async"
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: "cover",
          objectPosition: wallpaper.groundPosition ?? "center",
        }}
      />
      {wallpaper.motif && (
        <img
          src={wallpaper.motif}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{
            position: "absolute",
            left: "50%",
            top: wallpaper.motifTop ?? "24%",
            width: wallpaper.motifWidth ?? "60%",
            height: "auto",
            transform: "translateX(-50%)",
            opacity: wallpaper.motifOpacity ?? 0.34,
          }}
        />
      )}
    </div>
  );
}

/* the printed page's shared envelope: an inset double hairline frame
   with a floret at each corner — the stationery "card edge" that every
   page of the chapter shares.

   Only used on plain paper now (TitleScene, and an event page with no
   matching artwork) — a page WITH its own photographed gold plaque frame
   never gets a second drawn frame on top of it (see EventScene). So the
   ink is always the gold-on-paper treatment; the old `onArt` cream-ink
   variant was dead once every shipped ceremony got real artwork. */
function PageEnvelope() {
  const ink = "var(--gold-invite)";
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
      <div className="absolute" style={{ inset, border: "1px solid", borderColor: ink, opacity: 0.34 }} />
      {/* inner hairline, offset a breath */}
      <div
        className="absolute"
        style={{ inset: `calc(${inset} + 5px)`, border: "1px solid", borderColor: ink, opacity: 0.16 }}
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
  const idle = useIdleScrollCue(inView);
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
      {/* the page — paper ground. The arch's silhouette used to be a
          faint, easily-missed "ghost" pinned to the bottom edge
          (opacity 0.055, 300px, `items-end`) — exactly the kind of
          decorative detail so subtle it reads as empty space rather
          than a considered composition. It's now a genuinely visible
          architectural presence spanning behind the whole text block —
          still a background element, never competing with the text for
          attention, but now doing real compositional work instead of
          leaving the page feeling like "blank paper + tiny text." */}
      <div aria-hidden="true" className="absolute inset-0" style={{ zIndex: 0, background: PAPER }} />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{ zIndex: 1 }}
      >
        <JharokhaArch width={420} style={{ opacity: 0.1, color: "var(--gold-invite)" }} />
      </div>
      <PageEnvelope />

      {/* PASS — the previous composition mechanically centred a fairly
          small text cluster in the exact middle of a 100dvh page,
          leaving large, unintentional-feeling empty margins above and
          below it (the literal "huge blank paper, tiny text" complaint).
          Fixed not by centring differently but by making the content
          itself substantially larger and more generously spaced, so the
          GROUP now occupies real visual territory — the fix this brief
          asks for is "increase important information substantially and
          use space intentionally," not "reposition text within empty
          space." */}
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
            fontSize: "clamp(16px, 3.6vw, 19px)",
            letterSpacing: "0.42em",
            marginLeft: "0.42em",
            textTransform: "uppercase",
          }}
        >
          The Celebrations
        </span>
        <h2
          style={{
            ...step(1),
            marginTop: 22,
            fontFamily: "var(--font-couple)",
            fontVariationSettings: '"opsz" 96, "SOFT" 40, "WONK" 0',
            fontWeight: 500,
            color: "var(--text-primary)",
            // no forced line break — natural wrapping (this is 3 short
            // words, never a single unbreakable one) means the browser
            // always finds a fit at any of the 360–412px widths this
            // must work at, rather than risking a hand-guessed break
            // clipping on the narrowest one
            fontSize: "clamp(38px, 11.5vw, 60px)",
            letterSpacing: "0.005em",
            lineHeight: 1.08,
          }}
        >
          Our Wedding Events
        </h2>
        <div style={{ ...step(2), marginTop: 34 }}>
          <HairRule width={180} node="diamond" style={{ opacity: 0.9 }} />
        </div>
        <p
          style={{
            ...step(3),
            marginTop: 28,
            maxWidth: 340,
            color: "var(--text-secondary)",
            fontFamily: "'Cormorant', serif",
            fontStyle: "italic",
            fontSize: "clamp(17px, 4.2vw, 20px)",
            lineHeight: 1.6,
          }}
        >
          Four days of ceremony, music and love — we would be honoured by
          your presence at each.
        </p>
      </div>
      <IdleDownArrow shown={idle} reduceMotion={reduce} />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   EventScene — one ceremony, one complete viewport, one designed
   page of the invitation suite.
   ───────────────────────────────────────────────────────────── */
function EventScene({
  event,
  reduce,
}: {
  event: EventData;
  reduce: boolean;
}) {
  const theme = useActiveTheme();
  const sceneRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const idle = useIdleScrollCue(inView);
  const d = parseEventDate(event.date);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const year = d.getFullYear();
  const dayNum = d.getDate();
  const motif = motifForEvent(event);
  /* this ceremony's OWN artwork, from the theme's asset map — never a path
     hardcoded here (see ThemeAssets.eventBackgrounds). One painting per
     event, applied permanently by `EventBackdrop` below. */
  const art = theme.assets.eventBackgrounds?.[motif];

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

  // a whisper of scale added to the existing rise+fade — the same
  // restrained "settle" quality the couple scene's own reveals use —
  // costs nothing in the layout (transform never affects flow), so it
  // was free to add without touching this section's already-tight
  // vertical budget at 375px-class viewports.
  const step = (i: number): CSSProperties => {
    if (reduce) return { opacity: 1 };
    return {
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
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
      {/* ── THIS PAGE'S OWN BACKGROUND — its full-screen back layer ──
          One permanently-applied painting per ceremony
          (theme.assets.eventBackgrounds, keyed by the ceremony's motif),
          rendered statically on top of the printed card's paper ground —
          so it is always present, never cycles, and a slow or missing
          image can never leave a blank page. It takes no gestures and
          moves with its own scene as one unit, exactly like every other
          full-screen page of the reel. */}
      {art ? (
        <EventBackdrop wallpaper={art} />
      ) : (
        <>
          {/* no matching theme artwork for this ceremony (not something
              any shipped event hits — every ceremony motif has its own
              photographed plaque — but the data model allows a custom
              event with no motif match): fall back to plain paper, the
              invitation's own arch ghost, the printed card envelope and
              this ceremony's own title text, since there is no
              photograph here to supply one. */}
          <div aria-hidden="true" className="absolute inset-0" style={{ zIndex: 0, background: PAPER }} />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 1,
              background: `radial-gradient(ellipse 92% 58% at 50% 20%, ${accentFor(motif)} 0%, transparent 72%)`,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none flex justify-center"
            style={{ zIndex: 1, opacity: 0.05 }}
          >
            <JharokhaArch width={280} />
          </div>
          <PageEnvelope />
        </>
      )}

      {/* ── the page's content — DATE and VENUE only ──────────────────
          The artwork itself now supplies the ceremony's name/title (an
          engraved gold ribbon painted into every theme-1 event photo)
          and its ornamental frame — the app no longer draws a title,
          emblem or second frame on top of it. This wrapper is
          positioned inside the artwork's OWN measured blank text panel:
          sampled directly from the shipped 768×1376 photographs
          (haldi/mehendi/sangeet/wedding/reception all agree closely),
          that panel sits at ≈37–72% of image height and ≈16–83% of
          width. `top`/`bottom` below use 38–70dvh — inside that
          measured ≈37–72% range, but with less extra safety margin
          pulled in than the previous pass (was 39.5–68dvh): this round
          substantially enlarges several tiers (month/year, venue,
          address) for readability, which needed real room back from
          somewhere, and the actual measured artwork safe-zone had more
          of it available than the earlier, more conservative bound was
          using. Still never the loosest possible reading of the
          measurement. `object-fit: cover` height-matches this portrait
          art on every phone (identical principle to the Couple scene's
          video: see brain.md "Artwork geometry facts"), so an image-
          height-% maps directly to the same dvh-%. When there's no
          artwork (fallback above), the same wrapper just centres in the
          full viewport instead — plain paper has no fixed panel to
          target. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center text-center"
        style={
          art
            ? {
                zIndex: 10,
                top: "38dvh",
                bottom: "30dvh",
                justifyContent: "center",
                padding: "0 clamp(20px, 6vw, 32px)",
                userSelect: "none",
                WebkitUserSelect: "none",
              }
            : {
                zIndex: 10,
                top: 0,
                bottom: 0,
                justifyContent: "center",
                padding: "0 clamp(22px, 6vw, 46px)",
                userSelect: "none",
                WebkitUserSelect: "none",
              }
        }
      >
        <div
          className="flex flex-col items-center"
          style={{ width: "100%", maxWidth: art ? "min(70vw, 280px)" : 460 }}
        >
          {/* the fallback-only title — real artwork already has its own
              engraved name, so this never renders alongside a photo */}
          {!art && (
            <h2
              style={{
                ...step(0),
                fontFamily: "var(--font-couple)",
                fontVariationSettings: '"opsz" 96, "SOFT" 45, "WONK" 0',
                fontWeight: 500,
                color: "var(--text-primary)",
                fontSize: "clamp(31px, min(8.8vw, 10.5dvh), 43px)",
                letterSpacing: "0.01em",
                lineHeight: 1.06,
                marginBottom: "clamp(11px, 2.4dvh, 17px)",
              }}
            >
              {event.name}
            </h2>
          )}

          {/* the date — engraved, invitation-styled. The day numeral
              carries the SAME dimensional gold-foil treatment as the
              Save the Date/welcome hero moments (see DAY_GOLD_* above) —
              the strongest, most deliberate voice on the page.

              PASS — date hierarchy fixed a second time: the previous
              pass already moved the numeral onto its own line, but
              "MONTH YEAR" was still only a modest step up from caption
              size, and WEEKDAY sat on a separate line above the numeral
              purely to carry the per-ceremony emblem — an extra line
              that cost real vertical room for no informational gain.
              Restructured to match the requested priority order exactly
              (numeral → month/year → day+time → venue → address → map):
              the emblem now sits alone, small, above the numeral;
              WEEKDAY and TIME are combined onto ONE line below month/
              year ("THURSDAY · 7:00 PM") instead of two separate lines;
              and that consolidation is what pays for a genuinely larger
              month/year tier (17–21px → 19–25px) without growing the
              block's total height. LEVEL 1 (numeral) → LEVEL 2 (month +
              year) → LEVEL 3 (weekday + time / venue) → LEVEL 4
              (address), all still ≥14px. */}
          <div style={{ ...step(1), display: "flex", flexDirection: "column", alignItems: "center" }}>
            <EventEmblem motif={motif} size={19} />

            {/* LEVEL 1 — the hero numeral */}
            <span
              style={{
                marginTop: "clamp(2px, 0.6dvh, 5px)",
                fontFamily: "var(--font-couple)",
                fontVariationSettings: '"opsz" 96, "SOFT" 50, "WONK" 1',
                fontWeight: 600,
                fontSize: "clamp(34px, min(10.6vw, 12dvh), 48px)",
                lineHeight: 0.9,
                background: DAY_GOLD_FILL,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: DAY_GOLD_EXTRUDE,
                filter: DAY_GOLD_AMBIENT,
              }}
            >
              {dayNum}
            </span>

            {/* LEVEL 2 — month + year, now a genuinely large, confident
                secondary tier rather than a caption */}
            <span
              className="font-sc"
              style={{
                marginTop: "clamp(1px, 0.3dvh, 3px)",
                color: "var(--gold-invite)",
                fontSize: "clamp(19px, 5vw, 25px)",
                fontWeight: 600,
                letterSpacing: "0.16em",
                marginLeft: "0.16em",
              }}
            >
              {month} {year}
            </span>

            {/* LEVEL 3 — weekday + time together on one line. The
                wedding ceremony's own exact time isn't confirmed yet
                (see EventData.time and invitation.ts), so that half
                simply doesn't render rather than showing a guessed
                value — the weekday still stands alone in that case. */}
            <span
              className="font-sc"
              style={{
                marginTop: "clamp(3px, 0.8dvh, 6px)",
                color: "var(--gold-invite)",
                fontSize: "clamp(15px, 3.4vw, 17px)",
                fontWeight: 600,
                letterSpacing: "0.2em",
                marginLeft: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {weekday}
              {event.time && ` · ${event.time}`}
            </span>
          </div>

          {/* a restrained gold hairline between the date and venue
              clusters — a fraction of a diamond node, not a full rule
              across the page, so the page reads as composed rather than
              two stacked text blocks. */}
          <div style={{ ...step(2), marginTop: "clamp(3px, 0.8dvh, 6px)" }}>
            <HairRule width="clamp(52px, 15vw, 76px)" node="diamond" style={{ opacity: 0.85 }} />
          </div>

          {/* the venue — LEVEL 3, distinct from the address beneath it
              (LEVEL 4) with a warmer, richer ink and a touch more size,
              while the address stays the smallest tier — kept just
              above the 13px baseline, never at it. */}
          <div style={{ ...step(2), marginTop: "clamp(4px, 1dvh, 7px)" }}>
            <span
              className="font-sc"
              style={{
                color: "var(--gold-invite-dim)",
                fontSize: "clamp(16px, 4vw, 19px)",
                fontWeight: 600,
                letterSpacing: "0.14em",
                marginLeft: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {event.venue}
            </span>
            {event.address && (
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "var(--text-tertiary)",
                  fontFamily: "'Cormorant', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(14px, 3vw, 16px)",
                  lineHeight: 1.4,
                }}
              >
                {event.address}
              </span>
            )}
          </div>

          {/* the action — now an obviously-pressable premium oval plaque
              instead of a text-like link (see ViewOnMapButton.tsx).
              Nudged closer to the venue/address block above it (was
              clamp(5px,1.1dvh,8px)) so the button sits higher within the
              artwork's own text-safe area, leaving visible breathing
              room beneath it before the panel's own lower bound rather
              than crowding it. */}
          {event.directionsUrl && (
            <div style={{ ...step(3), marginTop: "clamp(3px, 0.7dvh, 5px)" }}>
              <ViewOnMapButton href={event.directionsUrl} ariaLabel={`View ${event.venue} on Google Maps`} />
            </div>
          )}
        </div>
      </div>
      <IdleDownArrow shown={idle} reduceMotion={reduce} />
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

  return (
    <>
      <TitleScene reduce={reduce} />
      {events.map((event) => (
        <EventScene key={event.id} event={event} reduce={reduce} />
      ))}
    </>
  );
}
