import { useRef } from "react";
import { useInvitationStore } from "../../data/useStore";
import { invitationStore } from "../../data/store";
import type { GalleryImage } from "../../data/invitation";

/**
 * Gallery management — upload, preview, caption, reorder, and delete
 * couple photos. Images are stored as data URLs in localStorage for
 * development (no backend upload). In production this would upload to
 * a media service.
 */

export default function AdminGallery() {
  const invitation = useInvitationStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: GalleryImage[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        processed++;
        return;
      }
      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        newImages.push({ id, image: dataUrl, caption: "" });
        processed++;
        if (processed === files.length) {
          invitationStore.patch({ gallery: [...invitation.gallery, ...newImages] });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remove this photo?")) return;
    invitationStore.patch({ gallery: invitation.gallery.filter((g) => g.id !== id) });
  };

  const handleCaptionChange = (id: string, caption: string) => {
    invitationStore.patch({
      gallery: invitation.gallery.map((g) => (g.id === id ? { ...g, caption } : g)),
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= invitation.gallery.length) return;
    const gallery = [...invitation.gallery];
    const [moved] = gallery.splice(index, 1);
    gallery.splice(newIndex, 0, moved);
    invitationStore.patch({ gallery });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Gallery</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
            {invitation.gallery.length} {invitation.gallery.length === 1 ? "photo" : "photos"}
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#c9a869", color: "#141210" }}
        >
          + Upload Photos
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {invitation.gallery.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center border border-dashed"
          style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.01)" }}
        >
          <p style={{ color: "#6b7280", marginBottom: 4 }}>No photos yet.</p>
          <p style={{ color: "#4b5563", fontSize: 12 }}>Upload couple photos to appear in the gallery section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {invitation.gallery.map((img, i) => (
            <div
              key={img.id}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="aspect-[4/3] relative" style={{ background: "rgba(0,0,0,0.3)" }}>
                <img
                  src={img.image}
                  alt={img.caption || `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <input
                  value={img.caption || ""}
                  onChange={(e) => handleCaptionChange(img.id, e.target.value)}
                  placeholder="Add a caption..."
                  className="admin-input text-xs"
                  style={{ padding: "0.375rem 0.5rem" }}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: "#9ca3af" }}
                      aria-label="Move left"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveImage(i, 1)}
                      disabled={i === invitation.gallery.length - 1}
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: "#9ca3af" }}
                      aria-label="Move right"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="p-1 rounded"
                    style={{ color: "#ef4444" }}
                    aria-label="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
