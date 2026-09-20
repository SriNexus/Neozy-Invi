import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject, SyntheticEvent } from "react";
import type { CoupleData } from "../data/invitation";
import VideoBackground from "./VideoBackground";
import ScrollCue from "./ScrollCue";

/**
 * Couple introduction — the opening scene of the wedding film.
 *
 * The GATE FILM (gate-cinematic.mp4, ~23.8s, the same clip the guest's tap
 * starts) is this scene's ONLY background, full-bleed, untouched, for the
 * film's entire length — there is no card, no panel and no second
 * background layered over it at any point. Frame-by-frame inspection of
 * the actual file (see brain.md "Gate film geometry") found three real
 * phases the foreground below is built around:
 *
 *   0–~8s   an opening iris + a static Ganesha medallion (pure film)
 *   ~9–~13s an illustrated couple, with a genuinely blank sky above their
 *           heads (~17%–43% of frame height) — the WELCOME TEXT's stage
 *   ~13–17s a crossfade (whiteout) into —
 *   ~17–~23.8s an empty arched floral frame, completely blank inside
 *           (≈15%–70% of frame height) — the COUPLE CONTENT's stage. The
 *           film itself ends here (a fade to white), which is what the
 *           scroll cue then appears on.
 *
 * THE COUPLE CARD — an ivory/champagne panel (gumbad dome, border, halo,
 * pedestal) that used to hold the bride/groom names + parent lines +
 * wedding-hands — has been removed completely, by explicit request. That
 * removal is ONLY the container/background: the CONTENT it held is not
 * "Couple Card debris" and was never meant to go with it. The bride name,
 * her parent line, the wedding-hands mark, the groom name and his parent
 * line all remain, unchanged in data, typography and order, now simply
 * composited directly onto the film with no box behind them — the exact
 * distinction the project asked for: remove the card, keep the couple.
 *
 * THE WELCOME TEXT (9–12s in, 12–14s out) is a SEPARATE, SHORTER moment
 * that comes first — a short cinematic welcome phrase, never the couple's
 * names (their names get their own, better-lit moment at 17s+). It is
 * hard-confined to the middle 20% of the viewport height (30–50dvh) and
 * never drawn outside that band.
 *
 * The whole sequence is driven off the GATE FILM's own `currentTime` and
 * `ended` event — never a wall-clock timer independent of it — so the
 * text and the couple content always land on the frame they were
 * measured against, regardless of buffering or a slow device. It is
 * immune to re-renders, StrictMode double-invokes, resize and scroll, and
 * runs once per page load — scrolling away and back never replays it.
 * The film plays ONCE (no loop, `currentTime` never reset) and DISPLAYED
 * playback is held ~1s before the file's own real end (`EARLY_STOP_
 * SECONDS`, read live off `v.duration` — the asset itself is never
 * cropped/trimmed) — the arrow cue fires at that exact moment, over a
 * very subtle uniform dim on the held final frame, never a blackout and
 * never a replacement background.
 */

const STEPS = [
  "preroll",
  "textIn",
  "textOut",
  "brideName",
  "brideParent",
  "hands",
  "groomName",
  "groomParent",
  "arrow",
] as const;
type Step = (typeof STEPS)[number];

/** clock — SECONDS of the gate film's own `currentTime` (see the file
 *  header for the measured phases this is built from). `arrow` has no
 *  fixed time cue: it fires the instant playback actually stops (see
 *  `EARLY_STOP_SECONDS` below), so it always lands exactly when the
 *  guest sees the film stop, never a guessed second ahead of or behind
 *  it. By ~21s (groomParent's own reveal, ≈450ms after its 20.25s cue)
 *  the whole composition is settled — roughly 2s before the film now
 *  effectively ends (≈23.8s duration − 1s early-stop ≈ 22.8s) — and
 *  simply holds, unanimated, for that reading time until playback
 *  stops. */
const CUE: Record<Exclude<Step, "preroll" | "arrow">, number> = {
  textIn: 9, // the illustrated couple's blank sky is stable ~9–13s
  textOut: 12, // starts fading out well before the ~13–17s crossfade
  brideName: 17.5, // the arch has resolved; a beat of pure film, then the name
  brideParent: 18.25,
  hands: 18.75,
  groomName: 19.5,
  groomParent: 20.25,
};

/** stop displayed playback this many seconds before the film's own real
 *  end (read live from `v.duration`, never a hardcoded runtime) — the
 *  file itself is never cropped/trimmed/re-encoded, only the DISPLAYED
 *  playback is held a beat early, so the transition to the scroll cue
 *  never runs into the film's very last, fastest-fading instant. */
const EARLY_STOP_SECONDS = 1;

/** the shared easing vocabulary — a gentle glide + soft settle, used for
 *  every reveal in this scene so it reads as one hand drawing it. */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** a slow controlled growth eased into a dead-calm settle — no spring,
 *  no overshoot. The wedding-hands mark uses it. */
const EASE_ARRIVE = "cubic-bezier(0.34, 0.02, 0.12, 1)";

/** the gate film — the same clip the guest's tap starts playing; this
 *  component only ever reads/watches it, never plays or resets it (the
 *  parent owns that, via the shared `videoRef`). */
const GATE_VIDEO_SRC = "/themes/theme-1/videos/gate-cinematic.mp4";
const GATE_VIDEO_POSTER = "/themes/theme-1/images/cover.jpg";

export default function CoupleIntro({
  active,
  couple,
  videoRef,
  videoUnavailable,
  onVideoError,
  reduceMotion,
  onComplete,
  onAdvance,
}: {
  active: boolean;
  couple: CoupleData;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** true if the film could not be played at all — the sequence then
   *  jumps straight to its finished state instead of waiting on
   *  `currentTime`/`ended` events that will never arrive. */
  videoUnavailable: boolean;
  onVideoError: (e: SyntheticEvent<HTMLVideoElement>) => void;
  reduceMotion: boolean;
  onComplete: () => void;
  onAdvance: () => void;
}) {
  const [step, setStep] = useState<Step>("preroll");

  const bride = { name: couple.name2, parents: couple.brideParents };
  const groom = { name: couple.name1, parents: couple.groomParents };

  const completedRef = useRef(false);
  const cbRef = useRef({ onComplete });
  cbRef.current = { onComplete };

  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    cbRef.current.onComplete();
  };

  /* ── the sequence clock — driven by the gate film's OWN currentTime,
        never a wall-clock timer independent of it (see CUE above). The
        golden chevron is not a time cue at all: it is set the instant
        the film's `ended` event fires (wired below, on VideoBackground),
        so it always lands exactly when the guest sees the film stop. ── */
  useEffect(() => {
    if (!active) return;

    if (reduceMotion || videoUnavailable) {
      // simplified, but still content-complete: show the full couple
      // composition and hand scrolling back a beat later.
      setStep("groomParent");
      const t = window.setTimeout(() => {
        setStep("arrow");
        complete();
      }, 900);
      return () => window.clearTimeout(t);
    }

    const v = videoRef.current;
    if (!v) return;

    const stepFor = (t: number): Step => {
      let s: Step = "preroll";
      for (const k of STEPS) {
        if (k === "preroll" || k === "arrow") continue;
        if (t >= CUE[k]) s = k;
      }
      return s;
    };

    let last: Step | null = null;
    let stopped = false;
    const onTime = () => {
      const s = stepFor(v.currentTime);
      if (s !== last) { last = s; setStep(s); }

      // ── stop ~1s before the film's real end ─────────────────────
      // Never crops/trims the file itself — just holds playback on
      // whatever frame it has reached at that point, exactly the way
      // `ended` would, just a beat sooner. `v.duration` is read live
      // (never hardcoded), so this always tracks the actual asset.
      // `ended` (below) stays wired as a safety net for the rare case
      // `duration` isn't a finite number yet.
      if (!stopped && Number.isFinite(v.duration) && v.currentTime >= v.duration - EARLY_STOP_SECONDS) {
        stopped = true;
        try { v.pause(); } catch { /* noop */ }
        setStep("arrow");
        complete();
      }
    };
    v.addEventListener("timeupdate", onTime);
    onTime(); // covers StrictMode's double-invoke landing mid-playback
    return () => v.removeEventListener("timeupdate", onTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion, videoUnavailable]);

  // the film's natural end — a safety net alongside the early-stop
  // watchdog above, for the rare case `duration` was never available.
  const handleVideoEnded = () => {
    setStep("arrow");
    complete();
  };

  const reached = useMemo(() => {
    const i = STEPS.indexOf(step);
    return (s: Step) => i >= STEPS.indexOf(s);
  }, [step]);

  const textShown = reached("textIn") && !reached("textOut");
  const hands = reached("hands");

  return (
    <section
      data-reel-scene
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* the gate film — this scene's OWN, ONLY background, inside the
          section, so film + text + couple content all move together as
          one scene when the guest scrolls on to the date. Mounted from
          first render (see PublicInvitation); this component only
          watches it. */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <VideoBackground
          ref={videoRef}
          src={GATE_VIDEO_SRC}
          poster={GATE_VIDEO_POSTER}
          onEnded={handleVideoEnded}
          onError={onVideoError}
        />
      </div>

      {/* only a whisper of a filmic edge-vignette (top & bottom) for
          depth — the painted scene stays fully visible throughout. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background:
            "linear-gradient(180deg, rgba(12,10,16,0.18) 0%, transparent 13%, transparent 84%, rgba(12,10,16,0.16) 100%)",
        }}
      />

      {/* a very subtle, uniform dim — NOT a blackout, NOT a card
          background — that fades in the instant playback actually stops
          (the same `arrow` cue), so the held final frame lowers just
          enough for the scroll chevron to read clearly against it. The
          film itself is still what's visible underneath; nothing new is
          introduced behind the arrow. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 20,
          background: "rgba(10,8,7,0.22)",
          opacity: reached("arrow") ? 1 : 0,
          transition: "opacity 0.9s ease",
        }}
      />

      {/* ── THE WELCOME TEXT — 9–12s in, 12–14s out, in the illustrated
          couple's own blank sky (measured at ~17%–43% of frame height;
          see the file header). Hard-confined to a 20dvh band starting at
          30dvh so it can never drift into the top florals or graze the
          couple's heads (which begin ~43%), regardless of viewport or
          content length — the band clips (`overflow: hidden`) rather
          than ever let content escape it.

          THREE tiers, building to the one word that has to land —
          "WEDDING" — rather than one flat line: a tiny ceremonial line,
          a slightly larger intro phrase, then the hero word itself in
          the dimensional gold foil. An earlier pass's "We Welcome You"
          never actually said the word "wedding" — a guest could read it
          without knowing what they were being welcomed TO; this fixes
          that directly. Still a SEPARATE, SHORTER moment from the couple
          content below — never the couple's own names (those get their
          own, better-lit moment once the arch has resolved, at 17s+).
          No box, no pill, no glassmorphism, no glow — just ink, weight
          and light, the way a title card in a wedding film would be
          set. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 flex flex-col items-center pointer-events-none"
        style={{
          top: "30dvh",
          height: "20dvh",
          paddingTop: "1.2dvh",
          zIndex: 8,
          overflow: "hidden",
          opacity: textShown ? 1 : 0,
          transform: textShown ? "translateY(0) scale(1)" : "translateY(10px) scale(0.985)",
          transition: reduceMotion
            ? "none"
            : reached("textOut")
              ? `opacity 1.3s ${EASE}, transform 1.3s ${EASE}`
              : `opacity 1.3s ${EASE} 0.1s, transform 1.3s ${EASE} 0.1s`,
        }}
      >
        {/* tier 1 — the ceremonial line, the same tracked "label" voice
            as ScrollCue/Countdown elsewhere in the invitation */}
        <span
          style={{
            fontFamily: "var(--font-invite-label)",
            fontWeight: 600,
            color: "var(--gold-invite-dim)",
            fontSize: "clamp(12px, 3.3vw, 15px)",
            letterSpacing: "0.3em",
            marginLeft: "0.3em",
            textTransform: "uppercase",
            textShadow: "0 1px 2px rgba(24,16,8,0.32), 0 1px 0 rgba(255,252,244,0.4)",
          }}
        >
          With Joy In Our Hearts
        </span>

        {/* tier 2 — the intro phrase: still the tracked label voice, a
            notch larger and richer than tier 1, but plainer than the
            hero word below it — a deliberate middle step in the build,
            not its own competing focal point. */}
        <span
          style={{
            marginTop: "clamp(4px, 0.9dvh, 8px)",
            fontFamily: "var(--font-invite-label)",
            fontWeight: 600,
            color: "var(--gold-invite)",
            fontSize: "clamp(17px, 4.6vw, 23px)",
            letterSpacing: "0.14em",
            marginLeft: "0.14em",
            textTransform: "uppercase",
            textShadow: "0 1px 2px rgba(24,16,8,0.3), 0 1px 0 rgba(255,252,244,0.35)",
          }}
        >
          Welcome To Our
        </span>

        {/* tier 3 — THE HERO WORD. A vertical light→dark gold gradient
            fill (the "raised metal catching light" read) plus three
            stacked drop-shadows — a bright hairline top edge, a close
            warm-dark crevice, and a wider soft shadow for separation
            from the busy film beneath. No backdrop-filter, no glow, no
            outline — the same restrained language the Countdown
            numerals later in this flow use. Substantially larger than
            either line above it: this is the word the whole moment
            exists to land. */}
        <span
          style={{
            marginTop: "clamp(2px, 0.6dvh, 6px)",
            fontFamily: "var(--font-invite-label)",
            fontWeight: 700,
            fontSize: "clamp(32px, 10vw, 48px)",
            lineHeight: 1.1,
            letterSpacing: "0.1em",
            marginLeft: "0.1em",
            textTransform: "uppercase",
            textAlign: "center",
            background:
              "linear-gradient(180deg, #f6e6b8 0%, #d9bd72 26%, #b8943f 54%, #8c6f32 80%, #a8863c 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter:
              "drop-shadow(0 1px 0 rgba(255,248,222,0.55)) drop-shadow(0 2px 2px rgba(80,55,20,0.35)) drop-shadow(0 6px 14px rgba(20,12,4,0.42))",
          }}
        >
          Wedding
        </span>
      </div>

      {/* ── THE COUPLE CONTENT ───────────────────────────────────────
          Bride name, her parent line, the wedding-hands mark, the groom
          name, his parent line — the SAME content, data and typography
          the old Couple Card held, now composited directly onto the
          film with NO box, border, fill or panel behind it. Only the
          card/container is gone; nothing else was removed.

          POSITION — measured against the gate film's arched frame:
          frame-by-frame measurement (see the file header, and brain.md
          "Gate film geometry") put the arch's clear interior at
          ≈15%–70% of frame height, centre ≈42.7dvh. `top: 43dvh`
          optically centres this whole group in THAT arch, exactly where
          the old plaque used to sit.

          Ink & shadow were adapted (not "redesigned") for the new
          context: the old names/parent-lines were tuned for CONTRAST
          against the plaque's own ivory paper, which no longer exists —
          set directly on the film now, they use the same dimensional
          gold-foil treatment as the welcome text above and the Countdown
          numerals later on, with a legibility shadow built for the
          film's own pale, watercolour tones. Same fonts, same order, same
          relative sizes and hierarchy as before. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{
          top: "43dvh",
          transform: "translateY(-50%)",
          paddingLeft: "clamp(16px, 5vw, 28px)",
          paddingRight: "clamp(16px, 5vw, 28px)",
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

        {/* THE UNION — the project's own wedding-hands artwork, the
            visual conjunction between the two names. Pure scale from a
            single point to rest via `EASE_ARRIVE`; no rotation, no
            bounce, no recolouring beyond a grounding drop-shadow — the
            same artwork, unmodified. Enlarged ~20% again this pass, from
            its own CURRENT rendered size (`clamp(84px,11dvh,108px)` →
            `clamp(101px,13.2dvh,130px)`) — a strong, unmistakable
            central separator between the two names, still short of
            colliding with either. */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: "100%",
            height: "clamp(101px, 13.2dvh, 130px)",
            margin: "clamp(11px, 2.2dvh, 20px) 0",
            overflow: "visible",
          }}
        >
          <img
            src="/themes/theme-1/images/wedding-hands.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              width: "clamp(101px, 13.2dvh, 130px)",
              height: "auto",
              transformOrigin: "50% 50%",
              opacity: hands ? 1 : 0,
              transform: hands ? "scale(1)" : "scale(0.02)",
              transition: reduceMotion
                ? "none"
                : `transform 1.1s ${EASE_ARRIVE}, opacity 0.6s ease`,
              filter: "drop-shadow(0 8px 18px rgba(30,20,10,0.34))",
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

      {/* the scene's invitation into the story, in the painted gap
          between the two pavilions: a small golden chevron with a
          tracked "BEGIN OUR STORY" wordmark beneath it. It arrives the
          instant playback actually stops (the `arrow` cue — no second
          timer), a beat AFTER the dim above begins (a short delay, so
          the screen visibly settles first, then the cue arrives), then
          breathes there quietly. Still a whisper, not a website CTA:
          the chevron stays the only interactive surface. */}
      <button
        type="button"
        onClick={onAdvance}
        aria-label="Begin our story — scroll to continue"
        tabIndex={reached("arrow") ? 0 : -1}
        className="absolute left-1/2"
        style={{
          bottom: "max(clamp(14px, 3.2dvh, 32px), env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
          zIndex: 30,
          background: "transparent",
          border: "none",
          padding: 8,
          cursor: "pointer",
          opacity: reached("arrow") ? 1 : 0,
          pointerEvents: reached("arrow") ? "auto" : "none",
          transition: "opacity 1s ease 0.3s",
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
}: {
  name: string;
  parents?: string;
  nameShown: boolean;
  parentsShown: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex flex-col items-center" style={{ maxWidth: "90vw", textAlign: "center" }}>
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
   face). This is the richest, largest voice on the scene — the
   letterforms and the ink carry the luxury, never an effect.

   INK — a dimensional antique-gold foil (the same recipe as the welcome
   text above and the Countdown numerals later on): a vertical
   light→dark gold gradient fill plus three stacked drop-shadows,
   because the name now sits directly on the film's own pale watercolour
   tones rather than the old plaque's ivory paper — a solid ink alone
   read too flat once the paper behind it was gone.

   Reveal — a refined type-on: each letter settles in sequence
   (opacity + a whisper of a rise + a softening blur), so the word
   reads as being written by hand. It is never a whole-word fade,
   never a bouncy per-letter entrance, never a typing cursor. The
   duration is NORMALIZED to the name length so GUNJAN (6 letters)
   and ABHAY (5 letters) both complete in the same ~0.7s (compressed
   from an earlier 2.5s pass to fit the gate film's 17.5–21s window —
   see CUE above): the first letter appears when the step fires, the
   last letter finishes exactly TOTAL ms later, and the letters overlap
   just enough to feel continuous rather than discrete.

   Layout is stable by construction: every letter is an in-flow
   inline-block, so the word occupies its final width before any
   letter is visible — revealing never reflows the composition, and
   the hands/parent lines never shift as a name types on.
   ───────────────────────────────────────────────────────────── */
/** the gold-foil ink shared by both letters of a per-letter reveal AND
 *  the reduced-motion single-node fallback — see the fix note below for
 *  why this must be applied per-LEAF, never on an ancestor wrapping
 *  animated children. */
const NAME_GRADIENT: CSSProperties = {
  background:
    "linear-gradient(180deg, #f6e6b8 0%, #d9bd72 26%, #b8943f 54%, #8c6f32 80%, #a8863c 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
const NAME_DROP_SHADOW =
  "drop-shadow(0 1px 0 rgba(255,248,222,0.55)) drop-shadow(0 2px 2px rgba(80,55,20,0.35)) drop-shadow(0 6px 14px rgba(20,12,4,0.42))";

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
    // dvh-based so the wordmark scales with the height-matched film. The
    // names are ONE of the strongest voices in this whole sequence —
    // enlarged again this pass (44–68px → 52–80px) — still proportional
    // on every phone, never a fixed-pixel size.
    fontSize: "clamp(52px, 7.4dvh, 80px)",
    letterSpacing: "0.01em",
    // Telma's descenders are short, so the line can sit tight without
    // crowding the parent line beneath
    lineHeight: 1.12,
    whiteSpace: "nowrap",
  };

  if (reduceMotion) {
    return <span style={{ ...base, ...NAME_GRADIENT, filter: NAME_DROP_SHADOW }}>{text}</span>;
  }

  // type-on: TOTAL ms from first letter to last letter, each letter
  // taking PER_LETTER ms with a normalized stagger so every name
  // length completes at the same moment.
  const TOTAL = 700;
  const PER_LETTER = 180;
  const step = (TOTAL - PER_LETTER) / Math.max(1, text.length - 1);

  return (
    <span style={{ ...base, display: "inline-block" }} aria-label={text}>
      {/* FIX: the gold-foil `background-clip:text` ink is applied to EACH
          LETTER individually here, not to this outer wrapper. Applying
          `background-clip:text` to an ancestor whose children carry their
          own animated `filter` (the per-letter blur-in below) made the
          browser composite those children as separate offscreen layers,
          which broke the ancestor's text-shaped gradient mask — the
          names rendered fully invisible (still `color:transparent`, but
          with no gradient successfully painted through), while
          `ParentLine` (a single plain-coloured node, no gradient/clip)
          stayed visible. Each letter is now its own leaf text node with
          its own gradient + clip + drop-shadow, the safe, spec-reliable
          way to combine per-character animation with gradient text. */}
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: "inline-block",
            ...NAME_GRADIENT,
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(0.045em)",
            filter: `${NAME_DROP_SHADOW} ${revealed ? "blur(0)" : "blur(2px)"}`,
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

/* Parent line — a quiet small-caps caption, the scene's second gold tier
   (softer/more muted than the names). Whole text, one gentle fade + rise;
   never per-letter, always subordinate to the name above it.

   Deliberately WITHOUT a flanking hairline+diamond: at a size that is
   actually readable, the flanks would either force the text to shrink
   back down to make room, or risk overflowing on a 360px phone with a
   long parent string. Tracking `0.13em` (not the wider `0.2em` an
   earlier pass tried) so it reads as engraved stationery rather than
   spaced-out metadata at a genuinely readable size. */
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
        // the scene's second gold tier — softer/more muted than the
        // names, still clearly gold, never grey. A plain solid ink (not
        // the foil treatment) keeps the hierarchy clear against the
        // names above; the shadow is built for the film's own pale
        // tones, not the old plaque's ivory paper.
        color: "var(--gold-invite-dim)",
        fontSize: "clamp(13px, 3.5vw, 16px)",
        letterSpacing: "0.13em",
        marginLeft: "0.13em",
        lineHeight: 1.55,
        textTransform: "uppercase",
        marginTop: "clamp(10px, 2vh, 17px)",
        textShadow: "0 1px 3px rgba(20,12,6,0.4), 0 1px 0 rgba(255,252,244,0.35)",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(6px)",
        transition: reduceMotion ? "none" : `opacity 0.45s ease, transform 0.45s ${EASE}`,
      }}
    >
      {text}
    </span>
  );
}
