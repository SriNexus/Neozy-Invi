/**
 * Minimal floating sound control. Only rendered once the guest has
 * interacted (audio has started). A small circular glass button — not a
 * player, just an unobtrusive ON/OFF affordance.
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
      className="fixed z-50 flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md bg-black/30 border border-[color:var(--gold-dim)]/60 text-[color:var(--gold-soft)] transition-opacity duration-500 active:scale-95"
      style={{
        bottom: "max(20px, env(safe-area-inset-bottom))",
        right: "max(20px, env(safe-area-inset-right))",
      }}
    >
      {on ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16 9l5 6M21 9l-5 6" />
        </svg>
      )}
    </button>
  );
}
