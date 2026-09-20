import { forwardRef } from "react";
import type { SyntheticEvent } from "react";

/**
 * The couple cinematic background. It is the background of the couple
 * introduction — nothing (no card, no panel) sits between it and the
 * foreground, only readability shading.
 *
 * It plays exactly ONCE. There is no `loop`, and the parent never resets
 * `currentTime` — when it ends (or when the intro sequence completes) it
 * is paused and its final frame stays on screen as a still backdrop.
 *
 * The parent owns the ref and calls `.play()` a single time, so this
 * element is mounted once and shared without ever remounting or resetting.
 *
 * The source is 720×1280 (portrait 9:16) — a painted jharokha whose
 * arch, lanterns and pavilions all sit well within the central ~80% of
 * the frame, with only decorative florals/peacock fans in the outer
 * margin.
 *
 * `object-fit: cover` / `object-position: center` with NO scale,
 * transform or zoom layered on top. On a phone taller than 9:16 (nearly
 * all of them) `cover` height-matches the art and trims ~9% off each
 * side — the outer florals only; nothing essential. `contain` is
 * rejected: it would letterbox top/bottom and the foreground (positioned
 * in vh units, calibrated to where the art lands under `cover`) would no
 * longer line up with the negative space. This is the minimum-crop fit.
 */
const VideoBackground = forwardRef<
  HTMLVideoElement,
  {
    src: string;
    poster?: string;
    className?: string;
    style?: React.CSSProperties;
    onEnded?: () => void;
    onError?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  }
>(function VideoBackground({ src, poster, className = "", style = {}, onEnded, onError }, ref) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={style}>
      <video
        ref={ref}
        className="absolute inset-0 w-full h-full object-cover object-center"
        muted
        playsInline
        preload="auto"
        poster={poster}
        onEnded={onEnded}
        onError={onError}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
});

export default VideoBackground;
