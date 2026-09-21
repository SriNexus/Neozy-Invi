import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { GalleryImage, CoupleData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { JharokhaArch, ThemeCorner, AmbientParticles } from "./decor/Ornaments";
import { prefersReducedMotion } from "../lib/motion";

/**
 * The Couple Photo Album — the invitation's closing photo sequence, read
 * as a VERTICAL reel: ONE photograph per full-screen moment, exactly like
 * the celebrations chapter.
 *
 *   … RECEPTION → PHOTO 1 → PHOTO 2 → … → PHOTO N → VENUE → RSVP → CLOSING
 *                      ▲ one deliberate gesture per photograph
 *
 * Every photograph is its own `data-reel-scene` 100dvh section, so the
 * EXISTING scene pager (useReelPager) walks the album the way it walks
 * every other page of the invitation: one swipe or wheel gesture = one
 * complete photograph, a rest is always a whole photograph, and only after
 * the LAST one does the page hand off to normal scrolling below the reel
 * (Venue → RSVP → Closing). Nothing new drives the scroll — no second
 * scroll system, no CSS scroll-snap, no global smooth scrolling — and
 * nothing here claims a gesture, so vertical touch/wheel stays entirely
 * with the pager.
 *
 * THERE ARE NO CONTROLS: no arrows, no chevrons, no dots, no buttons, no
 * horizontal track. The guest simply keeps moving down and each photograph
 * takes the screen as a full-screen album leaf.
 *
 * Each page is built like a leaf of luxury wedding stationery rather than
 * a website slide: the album's warm paper ground, a double hairline frame
 * with corner florets (the same printed envelope as the ceremony pages),
 * the photograph contained inside it at its natural aspect ratio (never
 * cropped, never stretched), a quiet "03 / 05" position mark and the
 * photograph's caption beneath. The photograph breathes in as its page
 * arrives — a slow scale settle and fade, no bounce, no zoom, no slide.
 *
 * Photos come from the gallery data (admin uploads). When the gallery is
 * empty the album shows the invitation's own artwork as a small set of
 * plates (`theme.assets.albumArt`), so the sequence is always a real
 * multi-photograph album; uploaded photographs replace it automatically.
 */

/* the album page ground — warmer than the celebration paper, so the
   album reads as the book's final pages */
const PAGE_BG =
  "linear-gradient(180deg, #fdfaf1 0%, #f6edda 52%, #eadbb8 100%)";

/* the leaf mat — where the photograph sits */
const MAT_BG = "#fbf7ec";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Reveal on arrival (threshold 0.3, disconnect after the first hit) —
 *  the photograph settles in as its page takes the screen. */
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

export default function CouplePhotoExperience({
  images,
  couple,
}: {
  images: GalleryImage[];
  couple: CoupleData;
}) {
  const theme = useActiveTheme();
  const reduce = useMemo(() => prefersReducedMotion(), []);

  const [broken, setBroken] = useState<Set<string>>(new Set());

  const uploaded = images.filter((i) => !broken.has(i.id));
  const albumArt = theme.assets.albumArt;

  /* No uploaded gallery → the invitation's own artwork as a set of plates
     (one full-screen page per file, in theme order). Captions are omitted,
     so each page falls back to the couple's names. A plate whose file is
     missing drops out and the others keep the album whole. */
  const photos: GalleryImage[] = useMemo(() => {
    if (uploaded.length > 0) return uploaded;
    return albumArt
      .filter((src) => !broken.has(src))
      .map((src) => ({ id: src, image: src }));
  }, [uploaded, broken, albumArt]);

  const count = photos.length;

  /* nothing at all to show (no gallery AND the artwork failed) */
  if (count === 0) {
    return (
      <section
        data-reel-scene
        className="relative w-full overflow-hidden flex items-center justify-center"
        style={{ height: "100dvh", background: PAGE_BG }}
      >
        <AmbientParticles count={8} seed={21} />
        <div className="relative z-10 text-center" style={{ maxWidth: 400, padding: "0 32px" }}>
          <span
            className="font-sc"
            style={{
              color: "var(--gold-invite-dim)",
              // kept above the parent-name baseline (13px), not just at it
              fontSize: "clamp(14px, 3vw, 16px)",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
            }}
          >
            Our Story
          </span>
          {/* canonical guest-facing name order: Gunjan (name2) then
              Abhay (name1) — matches CoupleIntro.tsx's own render order */}
          <h2
            className="mt-3"
            style={{
              fontFamily: "var(--font-couple)",
              color: "var(--text-primary)",
              fontSize: "clamp(30px, 8.4vw, 44px)",
              fontWeight: 500,
            }}
          >
            {couple.name2}
          </h2>
          <p
            style={{
              color: "var(--gold-invite)",
              fontFamily: "var(--font-couple)",
              fontSize: "clamp(18px, 5vw, 24px)",
              margin: "6px 0",
            }}
          >
            &amp;
          </p>
          <h2
            style={{
              fontFamily: "var(--font-couple)",
              color: "var(--text-primary)",
              fontSize: "clamp(30px, 8.4vw, 44px)",
              fontWeight: 500,
            }}
          >
            {couple.name1}
          </h2>
          <p
            className="mt-5"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "'Cormorant', serif",
              fontStyle: "italic",
              fontSize: "clamp(14px, 3.4vw, 15.5px)",
              lineHeight: 1.65,
            }}
          >
            A lifetime together, told one photograph at a time.
          </p>
        </div>
      </section>
    );
  }

  const total = String(count).padStart(2, "0");
  // canonical guest-facing name order: Gunjan (name2) then Abhay (name1)
  const fallbackCaption = `${couple.name2} & ${couple.name1}`;

  return (
    <>
      {photos.map((photo, i) => (
        <AlbumLeaf
          key={photo.id}
          photo={photo}
          index={i}
          total={total}
          fallbackCaption={fallbackCaption}
          reduce={reduce}
          onError={() => setBroken((s) => new Set(s).add(photo.id))}
        />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   AlbumLeaf — ONE photograph, one complete full-screen scene of the
   reel. Its own background, its own frame, its own reveal; it carries
   `data-reel-scene` so the existing pager consumes it one gesture at a
   time like every other page of the invitation.
   ───────────────────────────────────────────────────────────── */
function AlbumLeaf({
  photo,
  index,
  total,
  fallbackCaption,
  reduce,
  onError,
}: {
  photo: GalleryImage;
  index: number;
  total: string;
  fallbackCaption: string;
  reduce: boolean;
  onError: () => void;
}) {
  const { ref, inView } = useInView<HTMLElement>(0.3);
  /* under reduced motion the page is simply already there — no settle,
     no fade, nothing hidden */
  const shown = reduce || inView;

  const corners = ["tl", "tr", "br", "bl"] as const;
  const cornerPos: Record<(typeof corners)[number], CSSProperties> = {
    tl: { top: -1, left: -1 },
    tr: { top: -1, right: -1 },
    br: { bottom: -1, right: -1 },
    bl: { bottom: -1, left: -1 },
  };

  return (
    <section
      data-reel-scene
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh", background: PAGE_BG }}
    >
      {/* page atmosphere — the arch's ghost behind the leaf */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(ellipse 85% 55% at 50% 30%, rgba(200,170,110,0.12) 0%, transparent 74%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 pointer-events-none flex justify-center"
        style={{ zIndex: 0, opacity: 0.045 }}
      >
        <JharokhaArch width={300} />
      </div>

      <div
        className="relative flex flex-col"
        style={{ zIndex: 2, height: "100%", padding: "0 clamp(14px, 3.6vw, 28px)" }}
      >
        {/* ── the page header ── */}
        <header
          className="flex-none flex flex-col items-center text-center"
          style={{ paddingTop: "max(clamp(34px, 7dvh, 56px), env(safe-area-inset-top))" }}
        >
          <span
            className="font-sc"
            style={{
              color: "var(--gold-invite-dim)",
              // kept above the parent-name baseline (13px), not just at it
              fontSize: "clamp(14px, 3vw, 16px)",
              letterSpacing: "0.4em",
              marginLeft: "0.4em",
              textTransform: "uppercase",
            }}
          >
            Our Story
          </span>
          {/* hairline + counter — quiet editorial row */}
          <span
            className="flex items-center justify-center"
            style={{ gap: 12, marginTop: "clamp(10px, 2dvh, 14px)" }}
          >
            <span aria-hidden="true" style={{ width: 42, height: 1, background: "linear-gradient(90deg, transparent, var(--gold-invite))", opacity: 0.5 }} />
            <span
              className="font-sc"
              aria-label={`Photograph ${index + 1} of ${total}`}
              style={{
                color: "var(--gold-invite)",
                // kept above the parent-name baseline (13px), not just at it
                fontSize: "clamp(14px, 2.6vw, 15px)",
                fontWeight: 600,
                letterSpacing: "0.24em",
                marginLeft: "0.3em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(index + 1).padStart(2, "0")} <span style={{ opacity: 0.5 }}>/</span> {total}
            </span>
            <span aria-hidden="true" style={{ width: 42, height: 1, background: "linear-gradient(90deg, var(--gold-invite), transparent)", opacity: 0.5 }} />
          </span>
        </header>

        {/* ── the album leaf — the photograph is the hero ── */}
        <div className="flex-1 relative flex items-center justify-center" style={{ minHeight: 0 }}>
          <div
            className="relative"
            style={{
              width: "100%",
              maxWidth: 460,
              height: "100%",
              maxHeight: "100%",
              background: MAT_BG,
            }}
          >
            {/* leaf frame — double hairline + corner florets */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                border: "1px solid rgba(184,148,63,0.5)",
                boxShadow: "0 18px 44px rgba(96,72,30,0.14), 0 2px 8px rgba(96,72,30,0.08)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{ inset: 7, border: "1px solid rgba(184,148,63,0.24)" }}
            />
            <div
              aria-hidden="true"
              className="absolute"
              style={{
                left: "50%",
                bottom: -7,
                width: 92,
                height: 1,
                transform: "translateX(-50%)",
                background: "linear-gradient(90deg, transparent, rgba(184,148,63,0.7), transparent)",
              }}
            />
            {corners.map((c) => (
              <span
                key={c}
                aria-hidden="true"
                className="absolute"
                style={{ ...cornerPos[c], color: "var(--gold-invite)", zIndex: 3 }}
              >
                <ThemeCorner variant="floret" corner={c} size={22} />
              </span>
            ))}

            {/* the mat + the photograph, contained (never cropped or
                stretched) and breathing in as its page arrives */}
            <div className="absolute inset-0 overflow-hidden" style={{ inset: 14 }}>
              <figure className="relative m-0 w-full h-full flex items-center justify-center">
                <img
                  src={photo.image}
                  alt={photo.caption || `Photograph ${index + 1}`}
                  onError={onError}
                  draggable={false}
                  loading={index <= 1 ? "eager" : "lazy"}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    opacity: shown ? 1 : 0,
                    transform: shown ? "scale(1)" : "scale(1.035)",
                    transition: reduce ? "none" : `opacity 1.1s ease, transform 1.6s ${EASE}`,
                    willChange: "transform, opacity",
                  }}
                />
              </figure>
            </div>
          </div>
        </div>

        {/* ── the caption — no controls beneath it, deliberately ── */}
        <footer
          className="flex-none text-center"
          style={{
            paddingTop: "clamp(12px, 2.4dvh, 18px)",
            paddingBottom: "max(clamp(22px, 5dvh, 38px), env(safe-area-inset-bottom))",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontFamily: "'Cormorant', serif",
              fontStyle: "italic",
              fontSize: "clamp(14px, 3.6vw, 16px)",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              opacity: shown ? 1 : 0,
              transform: shown ? "translateY(0)" : "translateY(6px)",
              transition: reduce
                ? "none"
                : `opacity 0.9s ease 0.2s, transform 1.1s ${EASE} 0.2s`,
            }}
          >
            {photo.caption || fallbackCaption}
          </p>
        </footer>
      </div>
    </section>
  );
}
