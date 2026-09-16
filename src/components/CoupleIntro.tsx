import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { CoupleData } from "../data/invitation";
import VideoBackground from "./VideoBackground";
import ScrollCue from "./ScrollCue";

/**
 * Couple introduction — the opening scene of the wedding film.
 *
 * The couple background VIDEO is the only background. Nothing is drawn
 * between it and the foreground — no card, no panel, no gradient wash,
 * no rule, no ornament. Only a whisper of a filmic edge-vignette.
 *
 * The composition is built around the painted jharokha, NOT centred by
 * maths. Under `object-fit: cover` on a 360–412 phone the artwork lands
 * so that: the hanging lanterns bottom out near 150px; the arch's clear
 * central negative space runs from there down to ~640px (the domed
 * pavilions own everything below); the two peacocks sit at the far
 * left/right edges through the middle band. Every foreground element is
 * placed into that clear central channel.
 *
 * Three sacred marks, large enough to carry meaning on a phone, stacked
 * on the arch's centre axis (never side by side):
 *
 *        GANESHA          the invocation — a large devotional figure set
 *                         just clear of the lanterns, descending slowly
 *                         from above and settling
 *
 *        Gunjan           the bride — the identity of the wedding, set in
 *        her parents      Telma Bold (a high-contrast engraved-editorial
 *                         serif, self-hosted via --font-couple-custom);
 *                         one graceful fade + settle. Parents a hairline
 *                         of small-caps beneath.
 *
 *      · wedding hands ·  the union — a joined-hands centrepiece that
 *                         grows from a single point to full size, the
 *                         visual conjunction between the two names
 *
 *        Abhay            the groom — the identical treatment, cued a
 *        his parents      beat later so the two read as a matched pair
 *
 * then the film glides to rest, the scene quiets, and one small golden
 * chevron pulses in the painted gap between the pavilions.
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
  "ganesha",
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
 *  The gate film has just handed off; the couple film is given ~2s of
 *  its own life before the first mark is drawn onto the scene. Each
 *  event then lands, settles and is given air before the next —
 *  chapters, not a checklist. */
const CUE: Record<Exclude<Step, "preroll">, number> = {
  ganesha: 1800, // ~1.8s of pure film, THEN the descent from above begins
  brideName: 7000, // the descent (5s, from off-screen) settles → first name
  brideParent: 9700, // GUNJAN's 2.5s type-on completes → parents follow, quietly
  hands: 12000, // ~2.3s of stillness, THEN the union grows from a point
  groomName: 15000, // the hands reach full size and settle → the second name
  groomParent: 17600, // ABHAY's 2.5s type-on completes → parents follow
  settleHold: 18700, // everything placed — hold on the living film
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
/** Ganesha's descent: a strong, monotonic ease-out. It starts fully
 *  ABOVE the viewport and covers most of that hidden distance in the
 *  first ~40% of the duration, then the curve bleeds right off so the
 *  part the guest actually sees — the entry into frame and the set-down —
 *  is a slow, unhurried glide with no bounce and no overshoot. */
const EASE_DESCENT = "cubic-bezier(0.12, 0.72, 0.2, 1)";

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

  const gan = reached("ganesha");
  const hands = reached("hands");

  return (
    <section
      data-reel-scene
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* the couple film — this scene's OWN background, inside the section,
          so film + Ganesha + names + hands all move together as one scene
          when the guest scrolls on to the date. */}
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

      {/* ── GANESHA ──────────────────────────────────────────────────
          A devotional figure, not an icon — but sized and placed to sit
          cleanly in the channel BETWEEN the painted hanging lanterns and
          the bride's name, with clear air on both sides and no collision
          with either.

          Entrance: it begins entirely ABOVE the viewport (translateY of
          more than a full screen) and travels the whole way down into its
          resting place — the guest sees "something is descending from
          above", never "it appeared here and nudged". EASE_DESCENT covers
          the hidden distance quickly then eases right off, so the visible
          glide + set-down stay slow. No bounce, no spin, no spring. */}
      <div
        className="absolute left-1/2"
        style={{
          // ONE proportional coordinate system. The 720×1280 art is
          // height-matched under object-fit: cover on every portrait
          // phone, so every painted feature lives at a fixed FRACTION of
          // the scene height — the lanterns bottom out at ≈13.4% of the
          // scene, which is the figure's UPPER bound (above that it would
          // sit among the painted lanterns). Ganesha's top is therefore a
          // pure fraction of the scene (17.8dvh = 17.8% of height), which
          // keeps it clear of the lantern row on EVERY phone — the old
          // 118px floor was viewport-absolute and is what let the figure
          // drift relative to the painting on short phones. 17.8dvh is
          // ~10% lower than the previous 16.2dvh rest: the figure sits
          // deeper into the arch's clear channel, and the name lockup
          // below lifts by the same 10%, so the two re-balance around the
          // painting's own centre instead of both sitting high. Clear air
          // between the figure's feet and the bride's name is preserved
          // (≥ ~88px on a 360×640).
          top: "17.8dvh",
          // dvh-assisted width so the figure tracks the artwork's own
          // scale (painted features grow with vh). ~10% smaller than the
          // previous clamp(92px, 13.4dvh, 134px) — same devotional
          // presence, a shade more restrained, still proportional on
          // every phone, never a fixed-pixel size.
          width: "clamp(83px, 12.1dvh, 121px)",
          transform: `translateX(-50%) ${
            gan ? "translateY(0)" : "translateY(-150dvh)"
          }`,
          transformOrigin: "50% 0%",
          opacity: gan ? 1 : 0,
          transition: reduceMotion
            ? "none"
            : `transform 5s ${EASE_DESCENT}, opacity 0.4s ease`,
          willChange: "transform, opacity",
          zIndex: 12,
        }}
      >
        <img
          src="/themes/theme-1/images/ganesha.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            // a soft warm lift so the figure separates cleanly from the
            // painted scene behind it — a shadow on the art, not a card.
            filter:
              "drop-shadow(0 3px 10px rgba(250,244,232,0.5)) drop-shadow(0 10px 26px rgba(52,34,14,0.3))",
          }}
        />
      </div>

      {/* ── THE NAMES + THE UNION ────────────────────────────────────
          One tight vertical lockup set into the arch's clear central
          channel: bride, then the joined hands as the conjunction, then
          groom. The block is bottom-anchored to clear the pavilions and
          grows upward toward Ganesha as it assembles. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{
          // bottom-anchored so the block clears the domed pavilions and
          // grows upward toward Ganesha as it assembles — the names keep
          // their exact relationship to each other and to the hands.
          // ~10% higher than the previous clamp(73px, 14.9dvh, 136px):
          // the WHOLE lockup (names + parent lines + wedding hands) is
          // lifted as one unit, never element by element, so the
          // composition keeps its balance and the names simply sit a
          // touch deeper into the arch.
          bottom: "clamp(80px, 16.4dvh, 150px)",
          paddingLeft: "clamp(24px, 7vw, 48px)",
          paddingRight: "clamp(24px, 7vw, 48px)",
          zIndex: 10,
        }}
      >
        <NameBlock
          name={bride.name}
          parents={bride.parents}
          nameShown={reached("brideName")}
          parentsShown={reached("brideParent")}
          reduceMotion={reduceMotion}
        />

        {/* THE UNION — joined hands that grow from a single point to a
            full-size centrepiece. Pure scale; no rotation, no bounce,
            no overshoot. The 500×500 source is mostly transparent at the
            edges, so the wrapper contributes a modest height to the flow
            while the handshake itself reads large between the names. */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: "100%",
            height: "clamp(88px, 12.5dvh, 124px)",
            margin: "clamp(4px, 1dvh, 12px) 0",
            overflow: "visible",
          }}
        >
          <img
            src="/themes/theme-1/images/wedding-hands.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              // ~10% smaller than the original — the union stays a
              // full-size centrepiece between the names. Width is
              // dvh-assisted (≈21.6% of scene height) so it tracks the
              // height-matched painting, inside the approved 150–210px
              // envelope; height follows the 500×500 source ratio.
              width: "clamp(150px, 21.6dvh, 210px)",
              height: "auto",
              transformOrigin: "50% 50%",
              opacity: hands ? 1 : 0,
              transform: hands ? "scale(1)" : "scale(0.02)",
              transition: reduceMotion
                ? "none"
                : `transform 3.4s ${EASE_ARRIVE}, opacity 1.2s ease`,
              filter: "drop-shadow(0 10px 24px rgba(52,34,14,0.26))",
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

      {/* the scene's scroll invitation, in the painted gap between the
          two pavilions: a small golden chevron with a tracked SCROLL NOW
          wordmark beneath it. It arrives only after the couple film has
          settled and frozen (the existing `arrow` cue — no second timer),
          then breathes there quietly. Still a whisper, not a website
          CTA: the chevron stays the only interactive surface. */}
      <button
        type="button"
        onClick={onAdvance}
        aria-label="Scroll to continue"
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
        <ScrollCue shown={reached("arrow")} reduceMotion={reduceMotion} />
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
   register of a premium printed Indian wedding invitation, with
   the letterforms carrying the style. No wide tracking, no glow,
   no swash theatrics, no fake italic (the kit has no italic face).

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
   Ganesha/hands/parent lines never shift as a name types on.
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
    color: "var(--text-primary)",
    // dvh-based so the wordmark scales with the height-matched
    // painting: ≈40px on a 640px-tall phone, ≈49px on the common
    // 390×844, ≈54px on a 932px-tall phone — the SAME proportional
    // presence relative to the artwork on every device, inside the
    // previously approved 40–60px envelope.
    fontSize: "clamp(40px, 5.8dvh, 60px)",
    letterSpacing: "0.01em",
    // Telma's descenders are short, so the line can sit tight without
    // crowding the parent line beneath
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    // one tight dark offset for legibility where a stroke crosses a
    // painted lantern or peacock — NOT a halo, no light bloom.
    textShadow: "0 1px 2px rgba(38,26,14,0.24)",
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

/* Parent line — a hairline caption with the invitation's connective
   tissue (tapered rule + small gold diamond) flanking each side: a
   quiet, intentional stationery detail. Whole text, one gentle fade +
   rise; never per-letter, always subordinate to the name above it. */
function ParentLine({
  text,
  shown,
  reduceMotion,
}: {
  text: string;
  shown: boolean;
  reduceMotion: boolean;
}) {
  const flank = (invert: boolean) => (
    <span
      aria-hidden="true"
      style={{ display: "flex", alignItems: "center", gap: 6 }}
    >
      <span
        style={{
          width: 26,
          height: 1,
          background: invert
            ? "linear-gradient(90deg, var(--gold-invite), transparent)"
            : "linear-gradient(90deg, transparent, var(--gold-invite))",
          opacity: 0.5,
        }}
      />
      <span
        style={{
          width: 4,
          height: 4,
          background: "var(--gold-invite)",
          transform: "rotate(45deg)",
          opacity: 0.65,
        }}
      />
    </span>
  );

  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        marginTop: "clamp(10px, 1.8vh, 15px)",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(6px)",
        transition: reduceMotion ? "none" : `opacity 1.1s ease, transform 1.1s ${EASE}`,
      }}
    >
      {flank(false)}
      <span
        style={{
          fontFamily: "var(--font-invite-label)",
          fontWeight: 600,
          color: "var(--text-secondary)",
          fontSize: "clamp(8.5px, 2.3vw, 11px)",
          letterSpacing: "0.3em",
          marginLeft: "0.3em",
          lineHeight: 1.4,
          textTransform: "uppercase",
          textShadow: "0 1px 2px rgba(38,26,14,0.18)",
        }}
      >
        {text}
      </span>
      {flank(true)}
    </span>
  );
}
