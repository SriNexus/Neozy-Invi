/**
 * Full-screen invitation cover — the palace gate at night.
 * The entire image IS the tap target. No button, no text,
 * no marks — just the image. Tap anywhere to start the video.
 */
export default function Cover({
  onReveal,
  disabled,
}: {
  onReveal: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onReveal}
      disabled={disabled}
      aria-label="Tap to reveal the invitation"
      className="absolute inset-0 w-full h-full overflow-hidden appearance-none"
      style={{
        background: "var(--ink)",
        opacity: disabled ? 0 : 1,
        transition: "opacity 700ms ease",
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <img
        src="/themes/theme-1/images/cover.jpg"
        alt=""
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
    </button>
  );
}
