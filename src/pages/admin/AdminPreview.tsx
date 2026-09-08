import { useInvitationStore } from "../../data/useStore";

/**
 * Preview — opens the actual public invitation in a framed view so the
 * owner can see exactly what guests see. Uses the real invitation
 * rendering engine with current store data.
 */

export default function AdminPreview() {
  const invitation = useInvitationStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Preview</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
            This is exactly what guests will see.
          </p>
        </div>
        <a
          href={`/${invitation.settings.slug}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "rgba(201,168,105,0.15)", color: "#e7d3a0" }}
        >
          Open in New Tab →
        </a>
      </div>

      {/* Framed preview */}
      <div
        className="rounded-lg overflow-hidden border"
        style={{ borderColor: "rgba(255,255,255,0.1)", background: "#000" }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "#1a1d23", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
          </div>
          <div
            className="flex-1 mx-4 px-3 py-1 rounded text-xs"
            style={{ background: "rgba(0,0,0,0.3)", color: "#9ca3af" }}
          >
            localhost:5555/{invitation.settings.slug}
          </div>
        </div>

        {/* Invitation frame */}
        <div className="relative" style={{ height: "70vh", overflow: "hidden" }}>
          <iframe
            src={`/${invitation.settings.slug}`}
            className="w-full h-full border-0"
            style={{ background: "#0b0c0e" }}
            title="Invitation Preview"
          />
        </div>
      </div>
    </div>
  );
}
