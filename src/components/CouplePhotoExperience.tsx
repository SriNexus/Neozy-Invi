import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { GalleryImage, CoupleData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { JharokhaArch, ThemeCorner, AmbientParticles } from "./decor/Ornaments";
import { prefersReducedMotion, hasFinePointer } from "../lib/motion";

/**
 * The Couple Photo Album — the invitation's final full-screen scene
 * (data-reel-scene, one viewport, one owned background), read like a
 * page from a luxury wedding album rather than a website slider.
 *
 * The photograph is the hero: it sits inside an album-leaf frame —
 * an inset double hairline with corner florets, the same stationery
 * envelope as the celebration pages — and keeps its natural aspect
 * ratio (object-fit: contain; never stretched, never cropped).
 *
 *   · one horizontal swipe / arrow press changes the photograph
 *     (drag follows the finger 1:1, release settles by distance or
 *     flick velocity)
 *   · vertical swipes belong to the reel pager (useReelPager), which
 *     advances to the sections below — the two axes never fight
 *   · a refined “02 / 06” position marker and quiet chevron buttons,
 *     never dots or big arrows
 *   · photo changes settle with a slow scale-settle — a cinematic
 *     breath, no cubes or zooms
 *
 * Photos come from the gallery data (admin uploads). When the gallery
 * is empty the scene shows the invitation's own painted couple artwork
 * as a single framed plate, so the page is always designed; uploaded
 * photographs replace it automatically.
 */

/* the album page ground — warmer than the celebration paper, so the
   album reads as the book's final page */
const PAGE_BG =
  "linear-gradient(180deg, #fdfaf1 0%, #f6edda 52%, #eadbb8 100%)";

/* the leaf mat — where the photograph sits */
const MAT_BG = "#fbf7ec";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
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
  const fine = useMemo(() => hasFinePointer(), []);

  const [broken, setBroken] = useState<Set<string>>(new Set());

  const uploaded = images.filter((i) => !broken.has(i.id));
  const artImage = theme.assets.wallpaperPoster;

  const photos: GalleryImage[] = useMemo(() => {
    if (uploaded.length > 0) return uploaded;
    if (broken.has("_album-art")) return [];
    return [{ id: "_album-art", image: artImage, caption: `${couple.name1} & ${couple.name2}` }];
  }, [uploaded, broken, artImage, couple.name1, couple.name2]);

  const count = photos.length;

  /* ── carousel state ── */
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0); // live drag offset in px
  const [settling, setSettling] = useState(false);
  const [hint, setHint] = useState(true); // one-line “swipe” whisper on first arrival

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageW, setStageW] = useState(0);
  const dragRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    axis: "h" | "v" | null;
    lastX: number;
    lastT: number;
  } | null>(null);

  useEffect(() => {
    setIndex(0);
    setOffset(0);
    setSettling(false);
  }, [count]);

  // keep the stage width current — set during commit (ref callback) so
  // the very first paint is already laid out, then via ResizeObserver
  const setStage = useCallback((el: HTMLDivElement | null) => {
    stageRef.current = el;
    if (el && el.clientWidth) setStageW(el.clientWidth);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageW(el.clientWidth);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const settle = useCallback(
    (target: number, fromOffset = 0) => {
      setSettling(true);
      setOffset(0);
      setIndex(target);
      if (fromOffset === 0) {
        // already at rest — clear the settle flag on the next frame
        requestAnimationFrame(() => setSettling(false));
      } else {
        window.setTimeout(() => setSettling(false), 620);
      }
      if (reduce) setSettling(false);
    },
    [reduce],
  );

  const goTo = useCallback(
    (dir: -1 | 1) => {
      if (count < 2) return;
      const next = clamp(index + dir, 0, count - 1);
      if (next === index) return;
      setHint(false);
      settle(next, 1);
    },
    [index, count, settle],
  );

  /* ── drag handling — horizontal only; vertical is left to the reel ── */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (count < 2 || reduce) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      lastX: e.clientX,
      lastT: performance.now(),
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (!d.axis) {
      // wait for a clear axis — taps and vertical gestures stay untouched
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null; // vertical → the reel owns it
        return;
      }
      d.axis = "h";
      setHint(false);
    }
    if (d.axis !== "h") return;

    const W = stageW || 1;
    // rubber resistance at the album's ends
    let raw = dx;
    if ((index === 0 && raw > 0) || (index === count - 1 && raw < 0)) raw *= 0.28;
    setOffset(clamp(raw, -W * 0.62, W * 0.62));
    d.lastX = e.clientX;
    d.lastT = performance.now();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;

    if (d.axis !== "h") return;
    const W = stageW || 1;
    const lastDt = Math.max(8, performance.now() - d.lastT);
    const vx = (e.clientX - d.lastX) / lastDt; // px per ms
    const travel = offset;
    const absV = Math.abs(vx);
    const fast = absV > 0.5;
    const far = Math.abs(travel) > W * 0.13;

    let next = index;
    if (far || fast) {
      const dir = travel < 0 || vx < 0 ? 1 : -1; // pulled left / flicked left → next
      next = clamp(index + dir, 0, count - 1);
    }
    settle(next, travel);
  };

  const onPointerCancel = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    // the browser took the gesture (e.g. it became a native vertical
    // pan) — glide back to the current photograph, never to another
    if (offset !== 0) settle(index, 1);
  };

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
              fontSize: "clamp(10px, 2.6vw, 12px)",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
            }}
          >
            Our Story
          </span>
          <h2
            className="mt-3"
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
            {couple.name2}
          </h2>
          <p
            className="mt-5"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "'Cormorant', serif",
              fontStyle: "italic",
              fontSize: "clamp(13px, 3.4vw, 15px)",
              lineHeight: 1.65,
            }}
          >
            A lifetime together, told one photograph at a time.
          </p>
        </div>
      </section>
    );
  }

  const single = count === 1;
  const W = stageW || 1;
  const x = -index * W + offset;
  const caption = photos[index]?.caption || `${couple.name1} & ${couple.name2}`;
  const pageNum = String(index + 1).padStart(2, "0");
  const pageCount = String(count).padStart(2, "0");

  const corners = ["tl", "tr", "br", "bl"] as const;
  const cornerPos: Record<(typeof corners)[number], CSSProperties> = {
    tl: { top: -1, left: -1 },
    tr: { top: -1, right: -1 },
    br: { bottom: -1, right: -1 },
    bl: { bottom: -1, left: -1 },
  };

  const hintStyle: CSSProperties = {
    opacity: hint && !single ? 1 : 0,
    transition: "opacity 0.7s ease",
  };

  return (
    <section
      data-reel-scene
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
              fontSize: "clamp(10px, 2.6vw, 12px)",
              letterSpacing: "0.5em",
              marginLeft: "0.5em",
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
              aria-live="polite"
              style={{
                color: "var(--gold-invite)",
                fontSize: "clamp(9px, 2.4vw, 10.5px)",
                fontWeight: 600,
                letterSpacing: "0.3em",
                marginLeft: "0.3em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pageNum} <span style={{ opacity: 0.5 }}>/</span> {pageCount}
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

            {/* mat + photo track */}
            <div
              ref={setStage}
              className="absolute inset-0 overflow-hidden"
              style={{
                inset: 14,
                cursor: single ? "default" : fine ? "grab" : "default",
                // both axes are JS-owned on this full-screen surface:
                // horizontal belongs to the carousel below, vertical to
                // the reel pager. `pan-y` would let the browser own
                // vertical pans here (Android honors it strictly), so a
                // vertical swipe over the album would become a native
                // momentum scroll the pager could no longer stop.
                touchAction: "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              role="group"
              aria-roledescription="carousel"
              aria-label="Couple photographs"
            >
              {single && (
                <div className="w-full h-full flex items-center justify-center">
                  <AlbumPlate
                    photo={photos[0]}
                    i={0}
                    active
                    reduce={reduce}
                    onError={() => setBroken((s) => new Set(s).add(photos[0].id))}
                  />
                </div>
              )}
              {!single && (
                <div
                  className="flex items-center"
                  style={{
                    height: "100%",
                    width: "100%",
                    transform: `translate3d(${x}px, 0, 0)`,
                    transition: settling
                      ? "transform 0.56s cubic-bezier(0.22, 1, 0.36, 1)"
                      : "none",
                    willChange: "transform",
                  }}
                >
                  {photos.map((photo, i) => {
                    // render only what can be reached — neighbouring plates
                    const near = Math.abs(i - index) <= 2;
                    if (!near) return <span key={photo.id} className="flex-none" style={{ width: "100%", flex: "0 0 100%" }} />;
                    // plates away from the centre recede — a whisper of depth
                    const norm = clamp(Math.abs((i * W + x) / W), 0, 1.4);
                    const dim = 1 - Math.min(1, norm) * 0.55;
                    const lift = 1 - Math.min(1, norm) * 0.022;
                    return (
                      <div
                        key={photo.id}
                        className="flex-none flex items-center justify-center"
                        style={{
                          width: "100%",
                          flex: "0 0 100%",
                          height: "100%",
                          opacity: dim,
                          transform: `scale(${lift})`,
                          transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)",
                          transformOrigin: "50% 50%",
                        }}
                      >
                        <AlbumPlate
                          photo={photo}
                          i={i}
                          active={i === index}
                          reduce={reduce}
                          onError={() => setBroken((s) => new Set(s).add(photo.id))}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── the caption + quiet controls ── */}
        <footer
          className="flex-none flex items-center"
          style={{
            paddingTop: "clamp(12px, 2.4dvh, 18px)",
            paddingBottom: "max(clamp(22px, 5dvh, 38px), env(safe-area-inset-bottom))",
            gap: 10,
          }}
        >
          <NavButton label="Previous photograph" disabled={single} onPress={() => goTo(-1)} dir="prev" />
          <div className="flex-1 text-center" style={{ minWidth: 0 }}>
            <p
              key={index}
              style={{
                ...(reduce ? {} : { animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both" }),
                margin: 0,
                color: "var(--text-secondary)",
                fontFamily: "'Cormorant', serif",
                fontStyle: "italic",
                fontSize: "clamp(13px, 3.6vw, 16px)",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {caption}
            </p>
            {/* a whisper that the album swipes sideways */}
            {!single && (
              <span className="flex items-center justify-center" style={{ gap: 7, ...hintStyle, marginTop: 6 }}>
                <svg width="12" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true" style={{ transform: "rotate(180deg)" }}>
                  <path d="M1 4h11M9 1l3 3-3 3" stroke="var(--gold-invite)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span
                  className="font-sc"
                  style={{
                    color: "var(--gold-invite-dim)",
                    fontSize: "clamp(8px, 2.2vw, 9.5px)",
                    letterSpacing: "0.32em",
                    marginLeft: "0.32em",
                    textTransform: "uppercase",
                  }}
                >
                  Swipe
                </span>
                <svg width="12" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true">
                  <path d="M1 4h11M9 1l3 3-3 3" stroke="var(--gold-invite)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
          <NavButton label="Next photograph" disabled={single} onPress={() => goTo(1)} dir="next" />
        </footer>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   AlbumPlate — one photograph inside the leaf: contains the whole
   image (no cropping, no stretching) and breathes on arrival.
   ───────────────────────────────────────────────────────────── */
function AlbumPlate({
  photo,
  i,
  active,
  reduce,
  onError,
}: {
  photo: GalleryImage;
  i: number;
  active: boolean;
  reduce: boolean;
  onError: () => void;
}) {
  return (
    <figure className="relative m-0 flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
      <img
        src={photo.image}
        alt={photo.caption || `Photograph ${i + 1}`}
        onError={onError}
        draggable={false}
        loading={i <= 2 ? "eager" : "lazy"}
        style={{
          display: "block",
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          // the plate breathes as it settles into the centre
          transform: active ? "scale(1)" : "scale(1.035)",
          opacity: active ? 1 : 0.96,
          transition: reduce
            ? "none"
            : "transform 1.1s cubic-bezier(0.16,1,0.3,1), opacity 0.9s ease",
        }}
      />
    </figure>
  );
}

/* a quiet hairline-circle chevron — never a big arrow */
function NavButton({
  label,
  dir,
  disabled,
  onPress,
}: {
  label: string;
  dir: "prev" | "next";
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className="flex-none"
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        border: "1px solid rgba(184,148,63,0.5)",
        background: "rgba(252,249,242,0.55)",
        color: "var(--gold-invite)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "background 0.3s ease, opacity 0.3s ease",
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ transform: dir === "prev" ? "rotate(180deg)" : "none" }}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
