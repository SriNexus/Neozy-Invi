/**
 * Minimal floating sound control. Only rendered once the guest has
 * interacted (audio has started) — the same moment `ScrollCue` appears,
 * so it must never compete with "Begin Our Story" for attention.
 *
 * A bare icon, not a button chrome: no glass pill, no filled background,
 * no border, no backdrop-blur (this invitation's convention is paper and
 * light, never glass — see brain.md). Legibility over whatever scene sits
 * behind it comes the same way `ScrollCue`'s marks do it: a tight dark
 * shadow for light artwork plus a soft warm glow for dark artwork, both
 * riding on `filter: drop-shadow` rather than a panel.
 */
export default function SoundToggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={on ? "Mute background music" : "Play background music"}
      aria-pressed={on}
      className="fixed z-50 flex items-center justify-center w-9 h-9 active:scale-95"
      style={{
        bottom: "max(16px, env(safe-area-inset-bottom))",
        right: "max(16px, env(safe-area-inset-right))",
        background: "transparent",
        border: "none",
        color: "var(--ivory, #f4efe4)",
        opacity: 0.82,
        filter:
          "drop-shadow(0 1px 2px rgba(24,16,8,0.55)) drop-shadow(0 0 5px rgba(255,228,168,0.35))",
        transition: "opacity 0.3s ease",
      }}
    >
      {on ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16 9l5 6M21 9l-5 6" />
        </svg>
      )}
    </button>
  );
}
