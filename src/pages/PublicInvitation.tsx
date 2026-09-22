import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cover from "../components/Cover";
import CoupleIntro from "../components/CoupleIntro";
import DateReveal from "../components/DateReveal";
import SoundToggle from "../components/SoundToggle";
import EventsSection from "../components/EventsSection";
import CouplePhotoExperience from "../components/CouplePhotoExperience";
import VenueSection from "../components/VenueSection";
import RsvpSection from "../components/RsvpSection";
import FloatingContact from "../components/FloatingContact";
import ClosingSection from "../components/ClosingSection";
import { useInvitationStore } from "../data/useStore";
import { useThemeApplication, useActiveTheme } from "../data/useTheme";
import { getWeddingDate } from "../data/invitation";
import { prefersReducedMotion } from "../lib/motion";
import { useReelPager, type ReelGate } from "../lib/useReelPager";

/**
 * Guest journey:
 *
 *   COVER ─tap→ COUPLE INTRO (ONE continuous gate film: envelope → couple
 *   illustration → WELCOME TEXT (9–14s, a short cinematic phrase, never the
 *   couple's names) → arched frame → COUPLE CONTENT (bride name, her
 *   parent line, wedding-hands, groom name, his parent line — 17s+) →
 *   film ends → arrow) ─arrow→ scroll on
 *
 * The gate film (gate-cinematic.mp4) IS this scene's ONLY background —
 * there is no "couple background video" and no card/panel layered over
 * it at any point (the old ivory Couple Card container was removed by
 * explicit request; see CoupleIntro.tsx's own header for the full
 * rationale — the CONTENT it held — names, parent lines, wedding-hands —
 * was NOT removed with it, and is composited directly onto the film).
 * The film is mounted once, inside `CoupleIntro`, from the very first
 * render (paused on its first frame, hidden behind the opaque Cover). The
 * guest's tap calls `.play()` on that SAME element and fades the Cover
 * away — the film is never remounted, never reset, never looped.
 * `CoupleIntro`'s whole foreground sequence (welcome text, then the
 * couple content, then the arrow) is driven off that one video's own
 * `currentTime`/`ended`, not a wall-clock timer, so it always tracks what
 * the guest is actually seeing.
 *
 * Each cinematic scene owns its OWN background so it moves as one unit:
 *   COUPLE INTRO renders the gate film as its section background;
 *   DATE REVEAL renders its own dedicated artwork (theme.assets.dateRevealPoster)
 *   as its section background. Scrolling from one scene to the next moves
 *   background + foreground together — nothing stays fixed behind.
 *   WORLD B — a single fixed opaque paper ground sits behind everything
 *   at the back; the semi-transparent later sections (Venue → Closing)
 *   read against it once the full-screen reel has scrolled away.
 *
 * The full-screen reel — COUPLE ↓ DATE ↓ CELEBRATIONS ↓ EVENTS ↓ ALBUM
 * (one full-screen PHOTOGRAPH per gesture) — is navigated by ONE coherent
 * scene system (useReelPager): a deliberate swipe or wheel gesture moves
 * exactly one complete scene (background and foreground together), a rest
 * is always one whole scene, and after the album's LAST photograph the
 * page hands off to normal scrolling for the paper sections.
 *
 * Sound: the gate film is silent; one looping background track is the only
 * audio, started inside the guest's tap, then only muted/unmuted.
 */

export default function PublicInvitation() {
  const [revealed, setRevealed] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  // true only if the film could not be played at all (rare autoplay/
  // decode failure) — CoupleIntro then jumps straight to its finished
  // state (full couple content + arrow) instead of waiting on a video
  // that will never advance.
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const invitation = useInvitationStore();
  const theme = useActiveTheme();
  useThemeApplication();

  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  const gateRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tapStartedRef = useRef(false);

  const dateRevealRef = useRef<HTMLDivElement | null>(null);

  // ── Save the Date gate — the reel's own pager consults this on every
  // forward attempt (see useReelPager.ts's `ReelGate`); it is not a
  // second navigation system, just one more check the existing decision
  // flow makes before it commits a forward move. `dateRevealedRef` is a
  // ref (not state) so DateReveal's own phase changes never re-run the
  // pager's effect; `blockedSignal` is real state because it drives this
  // scene's own notice UI, which does need to re-render.
  const dateRevealedRef = useRef(false);
  const [blockedSignal, setBlockedSignal] = useState(0);
  const handleDateRevealedChange = useCallback((v: boolean) => {
    dateRevealedRef.current = v;
  }, []);
  const reelGate: ReelGate = useMemo(
    () => ({
      isGated: (el) => el === dateRevealRef.current,
      canLeave: () => dateRevealedRef.current,
      onBlocked: () => setBlockedSignal((n) => n + 1),
    }),
    [],
  );

  // ONE full-screen scene navigator for the whole cinematic reel. It is
  // armed the moment the guest is allowed to scroll (after the intro's
  // golden arrow appears).
  const reelArmed = revealed && introDone;
  useReelPager(reelArmed, reelGate);

  const weddingDate = useMemo(() => getWeddingDate(invitation), [invitation]);

  const dateParts = useMemo(() => {
    const day = String(weddingDate.getDate());
    const month = weddingDate.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const year = String(weddingDate.getFullYear());
    const weekday = weddingDate.toLocaleString("en-US", { weekday: "long" });
    return { day, month, year, weekday };
  }, [weddingDate]);

  /* ── Tap → audio + the gate film, in place ─────────────────────────
     The <video> already lives inside CoupleIntro (mounted from first
     render, paused on frame 0, hidden behind the opaque Cover) — the tap
     only starts ITS playback and fades the Cover away. Nothing is
     swapped or remounted. */
  const handleReveal = useCallback(() => {
    if (tapStartedRef.current) return;
    tapStartedRef.current = true;
    setRevealed(true);

    const audio = audioRef.current;
    if (audio && invitation.music.enabled) {
      audio.muted = false;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    setAudioOn(true);

    const gate = gateRef.current;
    if (!gate) {
      setVideoUnavailable(true);
      return;
    }
    gate.muted = true;
    const p = gate.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => setVideoUnavailable(true));
    }
  }, [invitation.music.enabled]);

  const handleToggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setAudioOn(!audio.muted);
  }, []);

  // the film failed mid-playback (not just failed to start) — same
  // fallback as a failed .play(): jump straight to the finished state.
  const handleGateError = useCallback(() => {
    setVideoUnavailable(true);
  }, []);

  // CoupleIntro finished its sequence (film ended, arrow shown) → release
  const handleIntroComplete = useCallback(() => {
    setIntroDone(true);
  }, []);

  const scrollToDateReveal = useCallback(() => {
    dateRevealRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [reduceMotion]);

  /* ── Scroll lock: through the gate film AND the couple intro,
        released the moment the golden arrow appears ─────────────── */
  useEffect(() => {
    const root = document.documentElement;
    const locked = !introDone;
    if (locked) {
      const prev = root.style.overflow;
      root.style.overflow = "hidden";
      if (!revealed) window.scrollTo(0, 0);
      return () => { root.style.overflow = prev; };
    }
    root.style.overflow = "";
  }, [revealed, introDone]);

  const showChrome = revealed && introDone;

  return (
    <>
      {/* ── Cover — the tap target. It is the ONLY thing that fades away;
           the gate film underneath (inside CoupleIntro, below) is never
           swapped or remounted, only started. ── */}
      <div
        className="fixed inset-0 w-full overflow-hidden no-scrollbar"
        style={{
          height: "100dvh",
          background: "var(--ink)",
          zIndex: revealed ? -1 : 40,
          pointerEvents: revealed ? "none" : "auto",
          opacity: revealed ? 0 : 1,
          transition: "opacity 900ms ease",
        }}
      >
        <Cover onReveal={handleReveal} disabled={revealed} />
      </div>

      {/* ── World B — the single fixed opaque paper ground at the very
           back. The full-screen reel scenes carry their own opaque
           backgrounds and cover this while in view; it is what the
           semi-transparent paper sections read against once the reel
           has scrolled away. ── */}
      <div
        className="fixed inset-0 w-full paper-grain"
        style={{
          height: "100dvh",
          zIndex: 1,
          pointerEvents: "none",
          background: "var(--paper-world)",
        }}
      />

      {/* ── Scroll document ── mounted from the very first render (behind
           the opaque Cover above), so the gate film inside CoupleIntro is
           a live element, pre-buffering on its first frame, well before
           the guest ever taps.

           Every full-screen reel scene is marked `data-reel-scene` —
           the one source of truth for useReelPager's geometry. ── */}
      <div
        className="no-scrollbar"
        style={{
          minHeight: "100dvh",
          position: "relative",
          zIndex: 2,
        }}
      >
        <CoupleIntro
          active={revealed}
          couple={invitation.couple}
          videoRef={gateRef}
          videoUnavailable={videoUnavailable}
          onVideoError={handleGateError}
          reduceMotion={reduceMotion}
          onComplete={handleIntroComplete}
          onAdvance={scrollToDateReveal}
        />

        {/* DATE — one complete scene; the wrapper is the scene's mark */}
        <div ref={dateRevealRef} data-reel-scene>
          <DateReveal
            visible={revealed}
            day={dateParts.day}
            month={dateParts.month}
            year={dateParts.year}
            weekday={dateParts.weekday}
            time={invitation.wedding.time}
            weddingDate={weddingDate}
            bgPoster={theme.assets.dateRevealPoster}
            reduceMotion={reduceMotion}
            onRevealedChange={handleDateRevealedChange}
            blockedSignal={blockedSignal}
          />
        </div>

        {/* CELEBRATIONS + EVENTS — each ceremony is its own scene */}
        <EventsSection events={invitation.events} />

        {/* THE ALBUM — the reel's closing photo sequence: ONE complete
            full-screen photograph per scene, consumed one gesture at a
            time, with no carousel controls anywhere. Normal scrolling
            resumes after the LAST photograph (Venue → RSVP → Closing
            read as paper sections). */}
        <CouplePhotoExperience images={invitation.gallery} couple={invitation.couple} />

        <VenueSection venue={invitation.venue} layout={theme.layout.venueFallback} />
        <RsvpSection config={invitation.rsvp} events={invitation.events} />
        <ClosingSection couple={invitation.couple} closing={invitation.closing} contact={invitation.contact} />
      </div>

      {/* ── Audio — never unmounted, never restarted ── */}
      <audio ref={audioRef} src={invitation.music.src} loop preload="auto" />

      {showChrome && <SoundToggle on={audioOn} onToggle={handleToggleAudio} />}
      {showChrome && <FloatingContact contact={invitation.contact} />}
    </>
  );
}
