import { useState } from "react";
import { useInvitationStore } from "../../data/useStore";
import { invitationStore } from "../../data/store";

/**
 * Settings — manage publication status, public URL slug, and dangerous
 * actions (reset data).
 */

export default function AdminSettings() {
  const invitation = useInvitationStore();
  const [saved, setSaved] = useState(false);
  const [slug, setSlug] = useState(invitation.settings.slug);

  const handleSaveSlug = () => {
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!clean) return;
    invitationStore.patch({ settings: { ...invitation.settings, slug: clean } });
    setSlug(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePublished = () => {
    invitationStore.patch({
      settings: { ...invitation.settings, published: !invitation.settings.published },
    });
  };

  const handleReset = () => {
    if (!confirm("Reset all invitation data to defaults? This cannot be undone.")) return;
    invitationStore.reset();
    setSlug("abhay-gunjan");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Settings</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>Publication and access settings.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Publication status */}
        <div
          className="rounded-lg p-5 border"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: "#f4efe4" }}>Publication Status</p>
              <p style={{ color: "#6b7280", fontSize: 12 }}>
                {invitation.settings.published
                  ? "Your invitation is live and accessible to guests."
                  : "Your invitation is in draft mode."}
              </p>
            </div>
            <button
              onClick={togglePublished}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: invitation.settings.published ? "#22c55e" : "rgba(255,255,255,0.1)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: invitation.settings.published ? "22px" : "2px" }}
              />
            </button>
          </div>
        </div>

        {/* Public URL */}
        <div
          className="rounded-lg p-5 border"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="font-medium mb-3" style={{ color: "#f4efe4" }}>Public URL</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="px-3 text-sm" style={{ color: "#6b7280", background: "rgba(0,0,0,0.2)" }}>/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 px-2 py-2 text-sm bg-transparent outline-none"
                style={{ color: "#e5e7eb" }}
              />
            </div>
            <button
              onClick={handleSaveSlug}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#c9a869", color: "#141210" }}
            >
              {saved ? "Saved ✓" : "Save"}
            </button>
          </div>
          <p style={{ color: "#4b5563", fontSize: 11, marginTop: 8 }}>
            Your invitation will be accessible at: <code style={{ color: "#e7d3a0" }}>/{invitation.settings.slug}</code>
          </p>
        </div>

        {/* Danger zone */}
        <div
          className="rounded-lg p-5 border"
          style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}
        >
          <p className="font-medium" style={{ color: "#fca5a5" }}>Danger Zone</p>
          <p style={{ color: "#6b7280", fontSize: 12, marginTop: 2, marginBottom: 4 }}>
            Reset all invitation data to factory defaults. This action cannot be undone.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
