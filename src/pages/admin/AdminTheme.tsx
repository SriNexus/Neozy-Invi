import { useInvitationStore } from "../../data/useStore";
import { invitationStore } from "../../data/store";

/**
 * Theme selection — choose the visual language for the invitation.
 * The platform launches with 5 themes: 3 Hindu + 2 Muslim.
 * Selection changes the complete visual language, not just colors.
 */

const THEMES = [
  { id: "classic-gold", name: "Classic Gold", category: "Hindu", description: "Timeless gold on ivory with ornamental framing.", colors: ["#b8943f", "#faf7f0", "#2c2520"] },
  { id: "royal-maroon", name: "Royal Maroon", category: "Hindu", description: "Deep maroon and gold with rich textures.", colors: ["#800020", "#d4af37", "#1a0a0a"] },
  { id: "garden-pastel", name: "Garden Pastel", category: "Hindu", description: "Soft pastels with botanical motifs.", colors: ["#d4a5a5", "#f0e4d4", "#5a7247"] },
  { id: "emerald-mughal", name: "Emerald Mughal", category: "Muslim", description: "Emerald green with geometric Islamic patterns.", colors: ["#046a38", "#c9a227", "#0a1f0a"] },
  { id: "arabesque-blue", name: "Arabesque Blue", category: "Muslim", description: "Sapphire blue with arabesque detailing.", colors: ["#1e3a5f", "#e8d5a3", "#0a1628"] },
];

export default function AdminTheme() {
  const invitation = useInvitationStore();

  const selectTheme = (themeId: string) => {
    invitationStore.patch({ settings: { ...invitation.settings, themeId } });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Theme</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>Select your invitation's visual style.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEMES.map((theme) => {
          const active = invitation.settings.themeId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className="rounded-lg p-4 border text-left transition-all"
              style={{
                borderColor: active ? "rgba(201,168,105,0.5)" : "rgba(255,255,255,0.08)",
                background: active ? "rgba(201,168,105,0.08)" : "rgba(255,255,255,0.02)",
                boxShadow: active ? "0 0 0 1px rgba(201,168,105,0.3)" : "none",
              }}
            >
              {/* Color swatches */}
              <div className="flex gap-1.5 mb-3">
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full"
                    style={{ background: color, border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm" style={{ color: "#f4efe4" }}>{theme.name}</p>
                {active && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{ background: "rgba(201,168,105,0.2)", color: "#e7d3a0" }}
                  >
                    Active
                  </span>
                )}
              </div>
              <p style={{ color: "#6b7280", fontSize: 11, marginTop: 1 }}>{theme.category}</p>
              <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{theme.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
