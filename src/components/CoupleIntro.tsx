import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { CoupleData } from "../data/invitation";
import VideoBackground from "./VideoBackground";
import ScrollCue from "./ScrollCue";

/**
 * Couple introduction — the opening scene of the wedding film.
 *
 * The couple background VIDEO is the only background — full-bleed,
 * untouched. The foreground is a single piece of luxury wedding
 * stationery, the COUPLE PLAQUE, floating over it: a warm ivory/champagne
 * ORNAMENTAL ARCHED-TOP PANEL (paper texture + a hairline gold double-
 * border, following the panel's own arch, reused from the project's own
 * established card language — see `.paper-grain` in index.css and the
 * `Frame` pattern in RsvpSection.tsx) holding the whole introduction.
 * This is a deliberate, explicit exception to the "no cards" convention
 * elsewhere in the cinematic reel — asked for by name for this one scene.
 *
 * The shape is DELIBERATELY ASYMMETRIC, not a capsule/pill/cylinder: the
 * top corners carry a TRUE semicircular radius — `--dome-radius`, exactly
 * half the plaque's own width, used as a single value (so horizontal AND
 * vertical radius are equal) on both top corners. Two top corners each
 * with horizontal radius = half-width meet exactly in the middle (one
 * unbroken arc, no flat top-centre segment); vertical radius = half-width
 * too means the dome's height equals its radius — the geometric
 * definition of "upper half of a circle", i.e. a proper gumbad, not a
 * flattened ellipse-arc. The bottom corners carry a small, ordinary,
 * independent radius (`--base-corner`) plus a distinct small pedestal bar
 * sitting at the bottom edge — a "structured base", never matched to the
 * dome. The sides between them are plain straight verticals (border-
 * radius only touches the immediate corner regions). `--dome-radius`
 * doubles as the plaque's own top padding, so content always clears it.
 *
 * ONE continuous dimensional border wraps the whole perimeter — dome,
 * sides and base alike — via two thin INSET box-shadows (a soft light
 * highlight along the upper inside edge, a soft warm shadow along the
 * lower inside edge) layered under the 1px solid gold line. Because
 * box-shadow always respects border-radius, this "carved edge" bevel
 * travels around the dome's curve exactly as it does the straight sides
 * and flat base — not a border that only reads as dimensional at the
 * bottom pedestal.
 *
 * The plaque does NOT sit flush on the video — a soft, feathered, warm-
 * ivory halo (radial gradient + a light blur, entirely OUTSIDE the
 * plaque's own silhouette, never brightening the gold text) bleeds
 * outward underneath it, so the boundary reads as atmosphere gathering
 * around a painted panel rather than a UI card pasted on top. No
 * backdrop-filter anywhere (that reads as glass, and this is paper/paint)
 * and no heavy drop shadow — the pedestal's own small, soft, warm shadow
 * is the only deliberately-placed "grounding" shadow. Material, not
 * glassmorphism.
 *
 * The plaque is centred on the MIDDLE of the painted jharokha's clear
 * arch channel (see brain.md "Artwork geometry facts": lanterns bottom
 * out at ≈13.4% of scene height, pavilions begin at ≈76%) — not bottom-
 * anchored, not centred by maths, but placed in the artwork's own
 * negative space so it reads as resting inside the scene rather than
 * pinned to a screen edge. Its width is driven directly by viewport width
 * (`clamp(212px, 63vw, 266px)`), keeping a constant proportional side
 * margin (~18.5vw per flank) instead of a fixed cap that ate
 * proportionally more space on the narrowest phones.
 *
 * Inside the card, one composition, two names and their union, stacked on
 * its centre axis (never side by side) — no separate devotional figure
 * above it competing for the eye:
 *
 *        Gunjan           the bride — set in Telma Bold (a high-contrast
 *        her parents      engraved-editorial serif, self-hosted via
 *                         --font-couple-custom), in a rich antique gold
 *                         ink; one graceful letter-by-letter reveal.
 *                         Parents a quiet small-caps line beneath, sized
 *                         to be genuinely readable, in a softer gold.
 *
 *      · wedding hands ·  the union — the project's own wedding-hands
 *                         artwork, kept modest in size so it reads as the
 *                         connector between the names, not a second focal
 *                         point; grows from a single point to rest
 *
 *        Abhay            the groom — the identical treatment, cued a
 *        his parents      beat later so the two read as a matched pair
 *
 * The card itself gently reveals first (a soft fade + settle, once the
 * guest has had a beat of pure film), then the names/hands/parents land
 * in sequence inside it; then the film glides to rest, the scene quiets,
 * and one small golden chevron pulses in the painted gap between the
 * pavilions, below the card, with its own breathing room.
 *
 * The whole sequence is one deterministic clock (a single rAF loop from
 * a fixed t0). It is immune to re-renders, StrictMode double-invokes,
 * resize, scroll and video buffering, and runs once per page load —
 * scrolling away and back never replays it. The couple video plays ONCE
 * (no loop, never reset) and is paused near the 20s mark by BOTH the
 * clock and a `timeupdate` watchdog.
 */

const STEPS = [
  "preroll",
  "cardIn",
  "brideName",
  "brideParent",
  "hands",
  "groomName",
  "groomParent",
  "settleHold",
  "settled",
  "arrow",
] as const;
type Step = (typeof STEPS)[number];

/** clock — milliseconds from the moment the section becomes active.
 *  The gate film has just handed off; the couple film is given a brief,
 *  pure, uninterrupted beat before the card itself gently arrives — then
 *  each name/line/hand lands, settles and is given air before the next.
 *  `settled` stays pinned to ≈20.3s to line up with the video's own
 *  cinematic arc: it is visually static by ~20.6s (see `PAUSE_AT_SECONDS`
 *  below), so the whole foreground sequence resolves exactly as the film
 *  itself comes to rest — a long, deliberate hold on the couple while the
 *  film finishes, not a stall. */
const CUE: Record<Exclude<Step, "preroll">, number> = {
  cardIn: 1200, // ~1.2s of pure film, THEN the card gently fades + settles in (~1.6s)
  brideName: 3000, // the card has settled → the identity begins
  brideParent: 5700, // GUNJAN's 2.5s type-on completes → parents follow, quietly
  hands: 8100, // a still beat, then the union settles into place
  groomName: 11200, // the union has settled → the second name begins
  groomParent: 13900, // ABHAY's 2.5s type-on completes → parents follow
  settleHold: 15000, // everything placed — hold on the living film
  settled: 20300, // the film glides to its rest frame → pause + the quiet
  arrow: 22200, // ~1.9s after the quiet — the golden chevron; scroll returns
};

/** pause the couple video no later than this (seconds) — watchdog.
 *  The film is visually static well before its 23s end; ≈20.6s is a
 *  safe, invisible freeze on its rest composition. */
const PAUSE_AT_SECONDS = 20.6;

/** the shared easing vocabulary — one family so the scene reads as a
 *  single hand drawing it, not a stack of components. */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // gentle glide + soft settle
/** a slow controlled growth eased into a dead-calm settle — no spring,
 *  no overshoot. The wedding hands use it. */
const EASE_ARRIVE = "cubic-bezier(0.34, 0.02, 0.12, 1)";

export default function CoupleIntro({
  active,
  couple,
  videoRef,
  videoSrc,
  videoPoster,
  onVideoEnded,
  reduceMotion,
  onComplete,
  onAdvance,
}: {
  active: boolean;
  couple: CoupleData;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** the couple film — rendered as this scene's OWN background so the
   *  whole scene (film + foreground) scrolls away as one unit. */
  videoSrc: string;
  videoPoster?: string;
  onVideoEnded: () => void;
  reduceMotion: boolean;
  onComplete: () => void;
  onAdvance: () => void;
}) {
  const [step, setStep] = useState<Step>("preroll");

  const bride = { name: couple.name2, parents: couple.brideParents };
  const groom = { name: couple.name1, parents: couple.groomParents };

  // stable refs so the clock effect never needs to re-run
  const t0Ref = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const completedRef = useRef(false);
  const cbRef = useRef({ onComplete, videoRef });
  cbRef.current = { onComplete, videoRef };

  const freezeVideo = () => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    const v = cbRef.current.videoRef.current;
    // pause only — currentTime is never touched, so the frame stays put
    if (v && !v.paused) {
      try { v.pause(); } catch { /* noop */ }
    }
  };
  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    cbRef.current.onComplete();
  };

  /* ── watchdog: pause the video by its own currentTime ── */
  useEffect(() => {
    if (!active) return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.currentTime >= PAUSE_AT_SECONDS) freezeVideo();
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /* ── the sequence clock ── */
  useEffect(() => {
    if (!active) return;

    if (reduceMotion) {
      setStep("settled");
      const t = window.setTimeout(() => {
        freezeVideo();
        setStep("arrow");
        complete();
      }, 3600);
      return () => window.clearTimeout(t);
    }

    if (t0Ref.current == null) t0Ref.current = performance.now();
    const t0 = t0Ref.current;
    let raf = 0;
    let last: Step | null = null;

    const stepFor = (e: number): Step => {
      let s: Step = "preroll";
      for (const k of STEPS) {
        if (k === "preroll") continue;
        if (e >= CUE[k]) s = k;
      }
      return s;
    };

    const tick = () => {
      const e = performance.now() - t0;
      const s = stepFor(e);
      if (s !== last) { last = s; setStep(s); }
      if (e >= CUE.settled) freezeVideo();
      if (e >= CUE.arrow) complete();
      if (e < CUE.arrow + 250) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion]);

  const reached = useMemo(() => {
    const i = STEPS.indexOf(step);
    return (s: Step) => i >= STEPS.indexOf(s);
  }, [step]);

  const cardIn = reached("cardIn");
  const hands = reached("hands");

  return (
    <section
      data-reel-scene
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* the couple film — this scene's OWN background, inside the section,
          so film + names + hands all move together as one scene when the
          guest scrolls on to the date. */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <VideoBackground
          ref={videoRef}
          src={videoSrc}
          poster={videoPoster}
          onEnded={onVideoEnded}
        />
      </div>

      {/* only a whisper of a filmic edge-vignette (top & bottom) for
          depth — the painted scene stays fully visible. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background:
            "linear-gradient(180deg, rgba(12,10,16,0.18) 0%, transparent 13%, transparent 84%, rgba(12,10,16,0.16) 100%)",
        }}
      />

      {/* ── THE COUPLE PLAQUE ────────────────────────────────────────
          One piece of stationery, optically centred on the MIDDLE of the
          arch's clear channel (≈13.4%–76% of scene height — see brain.md
          "Artwork geometry facts"), not bottom-anchored: bride, then the
          wedding-hands artwork as the conjunction, then groom, all inside
          ONE plaque. The plaque is centred as a single unit — never
          moved or sized element by element.

          Fifth pass — the top is now a TRUE semicircular gumbad, not an
          ellipse-arc: `--dome-radius` is set to exactly HALF the
          plaque's own width (`calc(var(--plaque-w) / 2)`) and used as
          BOTH the horizontal and vertical radius on the top corners —
          geometrically, a corner whose horizontal and vertical radii are
          equal to half the box's width IS the upper half of a perfect
          circle (diameter = width), which is what makes it read as a
          proper dome instead of the previous, visibly flatter/squashed
          ellipse-cap (`--arch-cap` was a small fixed clamp, `36–50px`,
          far smaller than the half-width it would have needed to be for
          a true circle). The bottom keeps its own small, independent
          corner radius (`--base-corner`) — still a structured, near-flat
          base, never a curve, never matched to the dome.

          A true semicircle costs real height (dome height = plaque
          half-width, ~110–133px here — much more than the old 36–50px
          cap), so `top` moved from `51dvh` back to `45dvh` this pass —
          a direct, necessary consequence of the dome geometry, not an
          independent decision. Padding and the hands artwork
          (`68–90px` → `56–74px`) were both trimmed a further notch to
          help claw back height. On the narrowest required viewport
          (360px), the parent lines (`D/O MR. & MRS. VERMA` etc.) may
          now wrap to 2 lines — by hand-estimate they no longer reliably
          fit on one line at this width without shrinking the font
          (explicitly ruled out). A wrap is graceful, not a bug (no
          `nowrap` was ever set on `ParentLine`), but IF both wrap
          simultaneously, top/bottom clearance above the lantern/pavilion
          bands drops to only a few px either side — genuinely thin, not
          visually verified, worth a real on-device check specifically at
          360×640 with long parent strings.

          Width dropped another ~10%, symmetric, still viewport-driven:
          `clamp(236px, 70vw, 296px)` → `clamp(212px, 63vw, 266px)`.

          Sixth pass moved `top` to `49.5dvh` (a literal "10% lower,
          verbatim" request) and was flagged at the time as a real
          overshoot past the pavilion band on 360×640. Seventh pass
          reverted that to `45dvh`, because that overshoot conflicted with
          that pass's own "no bottom artwork collision" requirement AND
          because that pass added height (bigger wedding-hands, more
          parent-line breathing room, below) the 49.5dvh budget had no
          room for. Also removed: the inner hairline (the second gold
          line, 9px inset) — the outer border + the continuous inset
          bevel (below) now carry the "dimensional frame" job alone.

          Eighth pass — POSITION ONLY, verbatim "move the complete card
          10–15% lower, do not resize or touch internal spacing": `top`
          45dvh → 50dvh (+11.1%), nothing else in this file touched.
          WARNING, not silently absorbed this time either: with the
          current (larger, post-7th-pass) hands size and parent-line
          spacing, `50dvh` very likely reproduces — and by hand-estimate,
          slightly worsens — the same bottom-pavilion overshoot on 360×640
          that `49.5dvh` was reverted for last pass. It was requested a
          second time, explicitly ruling out the compensating trims used
          previously (smaller hands/padding), so there is no remaining
          lever in this file to absorb it without violating "do not
          resize the card." If the plaque is reported as sitting into the
          bottom artwork or crowding `ScrollCue` on a short phone, this
          value is why — the fix at that point has to be either a smaller
          downward shift, a smaller plaque, or moving `ScrollCue` itself,
          not a change hidden in this component alone. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{
          top: "50dvh",
          transform: "translateY(-50%)",
          // a small safety floor only — the plaque's own vw-based width
          // clamp is what actually guarantees the side margin now.
          paddingLeft: "clamp(12px, 3vw, 20px)",
          paddingRight: "clamp(12px, 3vw, 20px)",
          zIndex: 10,
        }}
      >
        {/* the plaque + its atmospheric halo, grouped so they move and
            fade in together as one unit. `position: relative` here,
            sized only by the plaque (the halo and base are pulled out of
            flow), is what lets their `inset`/offsets read as "just past
            the plaque's own edge" at any plaque size, without hand-tuned
            pixels re-measured per breakpoint. */}
        <div className="relative">
          {/* THE BLEND — a soft, feathered halo the SAME warm ivory/gold
              the plaque is made of, bleeding outward underneath it. This
              is what removes the "placed on top of the video" feeling:
              the video's own light seems to gather and warm up right
              where the plaque sits, so the boundary feels like part of
              the same painted world instead of a UI edge. It is
              intentionally NOT a glow on the plaque (no bloom, no
              brightening the gold) — it lives entirely OUTSIDE the
              plaque's silhouette, is never covered by the gold text, and
              never touches the video/date transition below. Top inset
              extended this pass to embrace the taller true-dome crown;
              bottom keeps its earlier extra room for the pedestal.
              A gentle `blur` on top of the gradient's own soft falloff,
              low peak opacity (≤0.34) — atmosphere, not a spotlight.
              Fades in with the plaque (`cardIn`), never moves
              independently. */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              inset: "-46px -26px -44px -26px",
              background:
                "radial-gradient(ellipse 56% 58% at 50% 52%, rgba(250,238,210,0.34) 25%, rgba(248,232,198,0.16) 58%, rgba(246,228,190,0) 82%)",
              filter: "blur(5px)",
              opacity: cardIn ? 1 : 0,
              transition: reduceMotion ? "none" : "opacity 1.8s ease",
            }}
          />

          {/* the plaque itself — an ornamental panel with a TRUE
              semicircular gumbad crown, NOT a capsule and NOT a squashed
              ellipse: `--dome-radius` is exactly half the plaque's own
              width (`--plaque-w`), used as a single value (so both the
              horizontal AND vertical radius) on the two top corners.
              Horizontal radius = half-width on EACH top corner means
              they meet exactly in the middle (one unbroken arc, no flat
              top-centre segment); vertical radius = half-width too means
              the dome's height equals its own radius — the geometric
              definition of "upper half of a circle". The bottom keeps
              its own small, independent, near-flat `--base-corner` — a
              structured base, never matched to the dome. Sides between
              them are plain straight vertical edges by construction.
              `--dome-radius` doubles as the plaque's own top padding, so
              content always clears the dome.

              THE CONTINUOUS BORDER: previously only the bottom pedestal
              read as "dimensional" (it has its own gradient + shadow);
              the rest of the perimeter was a flat single-colour line.
              Two thin INSET box-shadows now wrap the ENTIRE plaque — a
              soft light highlight along the upper inside edge and a
              soft warm shadow along the lower inside edge — the classic,
              extremely subtle "carved/embossed edge" technique. Because
              box-shadow (inset or not) always follows the element's own
              border-radius, this bevel travels around the dome's curve
              exactly as it does along the straight sides and the flat
              base — ONE continuous dimensional frame, not a border that
              appears only at the bottom. Still just 1–2px of inset
              shadow on top of a 1px solid gold line: thin and delicate,
              not a thick 3-D frame.

              Material, not glass: NO backdrop-filter (paper/paint has no
              business sampling and blurring what's behind it). The
              outer ambient shadow is a soft, close, warm separation —
              most of the "grounding" still comes from the pedestal's
              own, slightly stronger shadow below. */}
          <div
            className="relative paper-grain"
            style={
              {
                "--plaque-w": "clamp(212px, 63vw, 266px)",
                "--dome-radius": "calc(var(--plaque-w) / 2)",
                "--base-corner": "clamp(8px, 1.3dvh, 12px)",
                width: "var(--plaque-w)",
                paddingTop: "var(--dome-radius)",
                paddingBottom: "clamp(10px, 2dvh, 16px)",
                paddingLeft: "clamp(14px, 4.5vw, 22px)",
                paddingRight: "clamp(14px, 4.5vw, 22px)",
                background:
                  "linear-gradient(158deg, rgba(253,250,244,0.97) 0%, rgba(246,239,225,0.95) 100%)",
                boxShadow:
                  "0 1px 2px rgba(90,70,40,0.08), 0 4px 12px rgba(70,52,26,0.1), inset 0 1px 0 rgba(255,252,244,0.55), inset 0 -1px 0 rgba(120,92,45,0.22)",
                border: "1px solid rgba(184,148,63,0.3)",
                borderTopLeftRadius: "var(--dome-radius)",
                borderTopRightRadius: "var(--dome-radius)",
                borderBottomLeftRadius: "var(--base-corner)",
                borderBottomRightRadius: "var(--base-corner)",
                opacity: cardIn ? 1 : 0,
                transform: cardIn ? "translateY(0) scale(1)" : "translateY(10px) scale(0.985)",
                transition: reduceMotion ? "none" : `opacity 1.4s ease, transform 1.6s ${EASE}`,
              } as CSSProperties
            }
          >
            {/* the pedestal base — a small, distinct foot the plaque
                appears to rest on, so the bottom reads as a structured
                base rather than the panel just stopping. A vertical
                highlight→bronze gradient gives it a whisper of crafted,
                3-D tonal depth (light catching a small physical ledge),
                and its own soft, warm, close shadow is the ONLY
                deliberately-placed "drop shadow" in this composition —
                everything else is the diffuse halo above. */}
            <div
              aria-hidden="true"
              className="absolute"
              style={{
                bottom: -4,
                left: "50%",
                transform: "translateX(-50%)",
                width: "56%",
                height: "clamp(8px, 1.3dvh, 12px)",
                borderRadius: "2px 2px 4px 4px",
                background:
                  "linear-gradient(180deg, var(--gold-invite-light) 0%, var(--gold-invite-dim) 100%)",
                boxShadow: "0 3px 6px rgba(70,52,26,0.18)",
              }}
            />

            <div className="relative flex flex-col items-center">
              <NameBlock
                name={bride.name}
                parents={bride.parents}
                nameShown={reached("brideName")}
                parentsShown={reached("brideParent")}
                reduceMotion={reduceMotion}
              />

              {/* THE UNION — the project's own wedding-hands artwork, the
                  visual conjunction between the two names. Nudged back up
                  a notch this pass (`56–74px` → `62–78px`, with more
                  margin around it) — it had been trimmed twice purely to
                  buy vertical budget for the dome, past the point where
                  it read as a meaningful symbolic element rather than a
                  small icon. Still deliberately smaller than the names,
                  so it reads as the connector between GUNJAN and ABHAY,
                  not a second focal point. Pure scale from a single point
                  to rest; no rotation, no bounce, no overshoot, no
                  recolouring — the same artwork, unmodified. */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: "100%",
                  height: "clamp(62px, 8dvh, 78px)",
                  margin: "clamp(9px, 1.8dvh, 16px) 0",
                  overflow: "visible",
                }}
              >
                <img
                  src="/themes/theme-1/images/wedding-hands.png"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{
                    width: "clamp(62px, 8dvh, 78px)",
                    height: "auto",
                    transformOrigin: "50% 50%",
                    opacity: hands ? 1 : 0,
                    transform: hands ? "scale(1)" : "scale(0.02)",
                    transition: reduceMotion
                      ? "none"
                      : `transform 2.6s ${EASE_ARRIVE}, opacity 1.2s ease`,
                    filter: "drop-shadow(0 6px 14px rgba(52,34,14,0.22))",
                  }}
                />
              </div>

              <NameBlock
                name={groom.name}
                parents={groom.parents}
                nameShown={reached("groomName")}
                parentsShown={reached("groomParent")}
                reduceMotion={reduceMotion}
              />
            </div>
          </div>
        </div>
      </div>

      {/* the scene quiets once the composition has settled — a dull,
          warm vignette, never a blackout: the painted scene stays
          legible through it. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 140% 100% at 50% 40%, rgba(22,15,26,0.12) 0%, rgba(8,6,12,0.46) 100%)",
          opacity: reached("settled") ? 1 : 0,
          transition: "opacity 2s ease",
          zIndex: 20,
        }}
      />

      {/* the scene's invitation into the story, in the painted gap
          between the two pavilions: a small golden chevron with a
          tracked "BEGIN OUR STORY" wordmark beneath it. It arrives only
          after the couple film has settled and frozen (the existing
          `arrow` cue — no second timer), then breathes there quietly.
          Still a whisper, not a website CTA: the chevron stays the only
          interactive surface. */}
      <button
        type="button"
        onClick={onAdvance}
        aria-label="Begin our story — scroll to continue"
        tabIndex={reached("arrow") ? 0 : -1}
        className="absolute left-1/2"
        style={{
          // the cue is a tall mark now (arrow + wordmark + its pool of
          // light), so the offset drops with it: the whole thing stays
          // clear of the names above (~24px on a 360×640, more on taller
          // phones) and off the very bottom edge of the art.
          bottom: "max(clamp(14px, 3.2dvh, 32px), env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
          zIndex: 30,
          background: "transparent",
          border: "none",
          padding: 8,
          cursor: "pointer",
          opacity: reached("arrow") ? 1 : 0,
          pointerEvents: reached("arrow") ? "auto" : "none",
          transition: "opacity 1s ease",
        }}
      >
        <ScrollCue
          shown={reached("arrow")}
          reduceMotion={reduceMotion}
          label="Begin Our Story"
        />
      </button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   NameBlock — one couple name (the wedding's identity) with its
   parent line as a hairline caption beneath. They read as one
   unit: the gap within is small, the air to the next block large.
   ───────────────────────────────────────────────────────────── */
function NameBlock({
  name,
  parents,
  nameShown,
  parentsShown,
  reduceMotion,
  style,
}: {
  name: string;
  parents?: string;
  nameShown: boolean;
  parentsShown: boolean;
  reduceMotion: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className="flex flex-col items-center" style={{ maxWidth: "90vw", textAlign: "center", ...style }}>
      <LetterName text={name} revealed={nameShown} reduceMotion={reduceMotion} />
      {parents && (
        <ParentLine text={parents} shown={parentsShown} reduceMotion={reduceMotion} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   The identity wordmark — the couple's name set in Telma Bold
   (self-hosted display serif, `--font-couple-custom`): a high-
   contrast engraved-editorial face — romantic and ceremonial, the
   established couple-name voice for this project. No wide tracking,
   no glow, no swash theatrics, no fake italic (the kit has no italic
   face). This is the richest, largest voice on the card — the
   letterforms and the ink carry the luxury, never an effect.

   Reveal — a refined type-on: each letter settles in sequence
   (opacity + a whisper of a rise + a softening blur), so the word
   reads as being written by hand. It is never a whole-word fade,
   never a bouncy per-letter entrance, never a typing cursor. The
   duration is NORMALIZED to the name length so GUNJAN (6 letters)
   and ABHAY (5 letters) both complete in the same ~2.5s: the first
   letter appears when the step fires, the last letter finishes
   exactly TOTAL ms later, and the letters overlap just enough to
   feel continuous rather than discrete.

   Layout is stable by construction: every letter is an in-flow
   inline-block, so the word occupies its final width before any
   letter is visible — revealing never reflows the composition, and
   the hands/parent lines never shift as a name types on.
   ───────────────────────────────────────────────────────────── */
function LetterName({
  text,
  revealed,
  reduceMotion,
}: {
  text: string;
  revealed: boolean;
  reduceMotion: boolean;
}) {
  const base: CSSProperties = {
    fontFamily: "var(--font-couple-custom)",
    // Telma's only weight is 700 — declared honestly, never faked
    fontWeight: 700,
    // the richest tone of the card's gold hierarchy — a deep antique
    // gold/bronze ink, deliberately darker than --gold-invite-dim (used
    // for the parent lines) so the names read as the clear top tier.
    // Chosen for CONTRAST against the card's own ivory/champagne base,
    // not against the video: black was ruled out (too harsh on warm
    // stationery), the lighter --gold-invite tones were ruled out (too
    // close in value to the ivory card to read as "print").
    color: "var(--gold-invite-deep)",
    // dvh-based so the wordmark scales with the height-matched
    // painting. A deliberate step up from the original 40–60px
    // envelope — the names are the hero of the card and earn the
    // presence — still proportional on every phone, never a
    // fixed-pixel size.
    fontSize: "clamp(44px, 6.4dvh, 68px)",
    letterSpacing: "0.01em",
    // Telma's descenders are short, so the line can sit tight without
    // crowding the parent line beneath
    lineHeight: 1.12,
    whiteSpace: "nowrap",
    // a whisper of a printed-ink highlight, not a contrast shadow —
    // the card itself, not the video, sits behind this text now.
    textShadow: "0 1px 0 rgba(255,252,244,0.5)",
  };

  if (reduceMotion) {
    return <span style={base}>{text}</span>;
  }

  // type-on: TOTAL ms from first letter to last letter, each letter
  // taking PER_LETTER ms with a normalized stagger so every name
  // length completes at the same moment.
  const TOTAL = 2500;
  const PER_LETTER = 560;
  const step = (TOTAL - PER_LETTER) / Math.max(1, text.length - 1);

  return (
    <span style={{ ...base, display: "inline-block" }} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: "inline-block",
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(0.045em)",
            filter: revealed ? "blur(0)" : "blur(2px)",
            transition: `opacity ${PER_LETTER}ms ease, transform ${PER_LETTER}ms ${EASE}, filter ${PER_LETTER}ms ease`,
            transitionDelay: revealed ? `${Math.round(i * step)}ms` : "0ms",
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/* Parent line — a quiet small-caps caption, the card's second gold tier
   (softer/more muted than the names). Whole text, one gentle fade + rise;
   never per-letter, always subordinate to the name above it.

   Deliberately WITHOUT a flanking hairline+diamond: at a size that is
   actually readable, the flanks would either force the text to shrink
   back down to make room, or risk overflowing the plaque's width on a
   360px phone with a long parent string. The plaque's own border already
   carries the ornamentation, so the line reads as part of the same
   stationery from its small-caps typography and softer gold alone, not
   from its own decoration.

   Tracking eased back from 0.2em to 0.13em this pass — at a genuinely
   readable size, 0.2em read as "spaced-out metadata" rather than
   engraved stationery; a tighter, still-tracked small-caps setting feels
   more integrated with the identity type above it. Line-height opened up
   (1.4 → 1.55) and the gap from the name above widened slightly, so the
   line has real presence instead of sitting cramped under the name. */
function ParentLine({
  text,
  shown,
  reduceMotion,
}: {
  text: string;
  shown: boolean;
  reduceMotion: boolean;
}) {
  return (
    <span
      style={{
        display: "block",
        textAlign: "center",
        fontFamily: "var(--font-invite-label)",
        fontWeight: 600,
        // the card's second gold tier — softer/more muted than the
        // names, still clearly gold, never grey.
        color: "var(--gold-invite-dim)",
        fontSize: "clamp(13px, 3.5vw, 16px)",
        letterSpacing: "0.13em",
        marginLeft: "0.13em",
        lineHeight: 1.55,
        textTransform: "uppercase",
        marginTop: "clamp(10px, 2vh, 17px)",
        textShadow: "0 1px 0 rgba(255,252,244,0.4)",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(6px)",
        transition: reduceMotion ? "none" : `opacity 1.1s ease, transform 1.1s ${EASE}`,
      }}
    >
      {text}
    </span>
  );
}
