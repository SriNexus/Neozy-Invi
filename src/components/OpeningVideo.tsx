import { forwardRef } from "react";
import type { SyntheticEvent } from "react";

/**
 * The cinematic opening film — one continuous shot. Always silent; the
 * invitation's only sound is the separate looping background track owned
 * by the parent.
 *
 * The master is 720×1280 (portrait 9:16), rendered `object-fit: cover` /
 * `object-position: center` with no scale/transform on top. Its content —
 * bells, the Ganesha ring, the invocation, the elephants — is centred
 * and comfortably inside the frame, so `cover` on a taller-than-9:16
 * phone (a ~9% side trim) only clips the outermost bell/elephant edges.
 * `contain` would letterbox and is not worth the bars here. Never
 * autoplays on its own — the parent starts playback inside the guest's
 * tap gesture, per browser autoplay policy.
 */
const OpeningVideo = forwardRef<
  HTMLVideoElement,
  {
    visible: boolean;
    onEnded: () => void;
    onError: (e: SyntheticEvent<HTMLVideoElement>) => void;
  }
>(function OpeningVideo({ visible, onEnded, onError }, ref) {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 700ms ease",
        pointerEvents: "none",
        background: "var(--ink)",
      }}
    >
      <video
        ref={ref}
        className="w-full h-full"
        style={{ objectFit: "cover", objectPosition: "center" }}
        poster="/themes/theme-1/images/cover.jpg"
        playsInline
        muted
        preload="auto"
        onEnded={onEnded}
        onError={onError}
      >
        {/* H.264/MP4 only — the master render, at full resolution/bitrate.
            The VP9/WebM encode in /video is a much lower-resolution,
            lower-bitrate transcode and is intentionally not offered: every
            evergreen browser (desktop and mobile) plays H.264 MP4 natively,
            so a "compatibility" fallback would only ever serve a visibly
            softer cut to guests whose browsers can play the real one fine. */}
        <source src="/themes/theme-1/videos/gate-cinematic.mp4" type="video/mp4" />
      </video>
    </div>
  );
});

export default OpeningVideo;
