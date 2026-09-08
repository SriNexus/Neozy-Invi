import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import Cover from "../components/Cover";
import OpeningVideo from "../components/OpeningVideo";
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
import { useReelPager } from "../lib/useReelPager";

/**
 * Guest journey:
 *
 *   COVER ─tap→ GATE FILM ─ends→ (crossfade) ─→ COUPLE INTRO ─arrow→ scroll on
 *
 * The couple background video (below) plays exactly ONCE — no `loop`, and
 * `currentTime` is never reset. `CoupleIntro` pauses it when its sequence
 * settles and it then stays frozen on its final frame; nothing (render,
 * scroll, resize, StrictMode) ever restarts it.
 *
 * Each cinematic scene owns its OWN background so it moves as one unit:
 *   COUPLE INTRO renders the couple <video> as its section background;
 *   DATE REVEAL renders the film's frozen final frame (couple-poster.jpg,
 *   themes/theme-1/images)
 *   as its section background. Scrolling from one scene to the next moves
 *   background + foreground together — nothing stays fixed behind.
 *   WORLD B — a single fixed opaque paper ground sits behind everything
 *   at the back; the semi-transparent later sections (Venue → Closing)
 *   read against it once the full-screen reel has scrolled away.
 *
 * The full-screen reel — COUPLE ↓ DATE ↓ CELEBRATIONS ↓ EVENTS ↓ ALBUM —
 * is navigated by ONE coherent scene system (useReelPager): a deliberate
 * swipe or wheel gesture moves exactly one complete scene (background and
 * foreground together), a rest is always one whole scene, and after the
 * album the page hands off to normal scrolling for the paper sections.
 *
 * Sound: the gate film is silent; one looping background track is the only
 * audio, started inside the guest's tap, then only muted/unmuted.
 */

type Stage = "cover" | "video" | "card";

export default function PublicInvitation() {
  const [stage, setStage] = useState<Stage>("cover");
  const [audioOn, setAudioOn] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const invitation = useInvitationStore();
  const theme = useActiveTheme();
  useThemeApplication();

  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  const gateRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tapStartedRef = useRef(false);

  const coupleVideoRef = useRef<HTMLVideoElement | null>(null);
  const coupleStartedRef = useRef(false);
  const coupleLockedRef = useRef(false); // true once the intro has frozen it — never play again

  const dateRevealRef = useRef<HTMLDivElement | null>(null);

  // ONE full-screen scene navigator for the whole cinematic reel. It is
  // armed the moment the guest is allowed to scroll (after the intro's
  // golden arrow appears).
  const reelArmed = stage === "card" && introDone;
  useReelPager(reelArmed);

  const weddingDate = useMemo(() => getWeddingDate(invitation), [invitation]);
  const inCard = stage === "card";

  const dateParts = useMemo(() => {
    const day = String(weddingDate.getDate());
    const month = weddingDate.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const year = String(weddingDate.getFullYear());
    const weekday = weddingDate.toLocaleString("en-US", { weekday: "long" });
    return { day, month, year, weekday };
  }, [weddingDate]);

  /* ── Start the couple video exactly once ──────────────────────────
     Deferred one frame so the scroll document has flipped to
     `display:block` first — the <video> now lives inside CoupleIntro,
     and playback must never be kicked off while it is display:none. */
  const startCoupleVideo = useCallback(() => {
    if (coupleStartedRef.current || coupleLockedRef.current) return;
    coupleStartedRef.current = true;
    const play = () => {
      const v = coupleVideoRef.current;
      if (!v || coupleLockedRef.current) return;
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    requestAnimationFrame(play);
  }, []);

  /* ── Tap → audio + gate film ─────────────────────────────────── */
  const handleReveal = useCallback(() => {
    if (tapStartedRef.current) return;
    tapStartedRef.current = true;

    const audio = audioRef.current;
    if (audio && invitation.music.enabled) {
      audio.muted = false;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    setAudioOn(true);

    const gate = gateRef.current;
    if (gate) {
      gate.currentTime = 0;
      gate.muted = true;
      const p = gate.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => { startCoupleVideo(); setStage("card"); });
      }
      setStage("video");
    } else {
      startCoupleVideo();
      setStage("card");
    }
  }, [invitation.music.enabled, startCoupleVideo]);

  // gate film finished (or errored) → crossfade into the couple intro
  const handleGateEnd = useCallback(() => {
    startCoupleVideo();
    setStage("card");
  }, [startCoupleVideo]);

  const handleGateError = useCallback(
    (e: SyntheticEvent<HTMLVideoElement>) => {
      if (e.target !== gateRef.current) return;
      startCoupleVideo();
      setStage("card");
    },
    [startCoupleVideo],
  );

  const handleToggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setAudioOn(!audio.muted);
  }, []);

  // couple video reaches its natural end before the sequence does → freeze
  const handleCoupleVideoEnded = useCallback(() => {
    coupleLockedRef.current = true;
    const v = coupleVideoRef.current;
    if (v && !v.paused) { try { v.pause(); } catch { /* noop */ } }
  }, []);

  // CoupleIntro finished its sequence (video already paused) → lock + release
  const handleIntroComplete = useCallback(() => {
    coupleLockedRef.current = true;
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
    const locked = stage !== "card" || !introDone;
    if (locked) {
      const prev = root.style.overflow;
      root.style.overflow = "hidden";
      if (stage !== "card") window.scrollTo(0, 0);
      return () => { root.style.overflow = prev; };
    }
    root.style.overflow = "";
  }, [stage, introDone]);

  const openingActive = stage !== "card";
  const showChrome = inCard && introDone;

  return (
    <>
      {/* ── Gate film (crossfades out into the couple video) ── */}
      <div
        className="fixed inset-0 w-full overflow-hidden no-scrollbar"
        style={{
          height: "100dvh",
          background: "var(--ink)",
          zIndex: openingActive ? 40 : -1,
          pointerEvents: openingActive ? "auto" : "none",
          opacity: stage === "card" ? 0 : 1,
          transition: "opacity 900ms ease",
        }}
      >
        <Cover onReveal={handleReveal} disabled={stage !== "cover"} />
        <OpeningVideo
          ref={gateRef}
          visible={stage === "video"}
          onEnded={handleGateEnd}
          onError={handleGateError}
        />
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

      {/* ── Scroll document ── mounted from the moment of the tap (behind
           the gate film), so the couple <video> inside CoupleIntro is a
           live, visible element by the time the gate hands off to it and
           `startCoupleVideo()` runs — never played while `display:none`.

           Every full-screen reel scene is marked `data-reel-scene` —
           the one source of truth for useReelPager's geometry. ── */}
      <div
        className="no-scrollbar"
        style={{
          display: stage === "cover" ? "none" : "block",
          minHeight: "100dvh",
          position: "relative",
          zIndex: 2,
        }}
      >
        <CoupleIntro
          active={inCard}
          couple={invitation.couple}
          videoRef={coupleVideoRef}
          videoSrc={theme.assets.wallpaperVideo}
          videoPoster={theme.assets.wallpaperPoster}
          onVideoEnded={handleCoupleVideoEnded}
          reduceMotion={reduceMotion}
          onComplete={handleIntroComplete}
          onAdvance={scrollToDateReveal}
        />

        {/* DATE — one complete scene; the wrapper is the scene's mark */}
        <div ref={dateRevealRef} data-reel-scene>
          <DateReveal
            visible={inCard}
            day={dateParts.day}
            month={dateParts.month}
            year={dateParts.year}
            weekday={dateParts.weekday}
            time={invitation.wedding.time}
            weddingDate={weddingDate}
            bgPoster={theme.assets.wallpaperPoster}
            reduceMotion={reduceMotion}
          />
        </div>

        {/* CELEBRATIONS + EVENTS — each ceremony is its own scene */}
        <EventsSection events={invitation.events} />

        {/* THE ALBUM — the final reel scene; normal scrolling resumes
            after it (Venue → RSVP → Closing read as paper sections) */}
        <CouplePhotoExperience images={invitation.gallery} couple={invitation.couple} />

        <VenueSection venue={invitation.venue} layout={theme.layout.venueFallback} />
        <RsvpSection config={invitation.rsvp} events={invitation.events} />
        <ClosingSection couple={invitation.couple} closing={invitation.closing} />
      </div>

      {/* ── Audio — never unmounted, never restarted ── */}
      <audio ref={audioRef} src={invitation.music.src} loop preload="auto" />

      {showChrome && <SoundToggle on={audioOn} onToggle={handleToggleAudio} />}
      {showChrome && <FloatingContact contact={invitation.contact} />}
    </>
  );
}
