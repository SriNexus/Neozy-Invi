import { useRef, useState } from "react";
import { useInvitationStore } from "../../data/useStore";
import { invitationStore } from "../../data/store";

/**
 * Music settings — manage background music for the invitation.
 * Upload a new track or toggle music on/off.
 */

export default function AdminMusic() {
  const invitation = useInvitationStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("audio/")) {
      alert("Please select an audio file.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      invitationStore.patch({
        music: { ...invitation.music, src: reader.result as string },
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleMusic = () => {
    invitationStore.patch({
      music: { ...invitation.music, enabled: !invitation.music.enabled },
    });
  };

  const isCustomTrack = invitation.music.src.startsWith("data:");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Music</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>Background music settings.</p>
        </div>
      </div>

      <div
        className="rounded-lg p-5 border space-y-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium" style={{ color: "#f4efe4" }}>Enable Background Music</p>
            <p style={{ color: "#6b7280", fontSize: 12 }}>Music plays after the guest taps to reveal.</p>
          </div>
          <button
            onClick={toggleMusic}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: invitation.music.enabled ? "#c9a869" : "rgba(255,255,255,0.1)" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ left: invitation.music.enabled ? "22px" : "2px" }}
            />
          </button>
        </div>

        {/* Current track */}
        <div>
          <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>Current Track</p>
          <div
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(201,168,105,0.1)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e7d3a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: "#e5e7eb" }}>
                {isCustomTrack ? "Custom track" : "Default track"}
              </p>
              <p style={{ color: "#6b7280", fontSize: 11 }}>
                {isCustomTrack ? "Uploaded file" : "wedding-music.mp3"}
              </p>
            </div>
            {invitation.music.enabled && (
              <audio
                src={invitation.music.src}
                controls
                className="hidden sm:block"
                style={{ height: 32, width: 160 }}
              />
            )}
          </div>
        </div>

        {/* Upload */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: "rgba(201,168,105,0.12)", color: "#e7d3a0", opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? "Uploading..." : "Upload New Track"}
          </button>
          <p style={{ color: "#4b5563", fontSize: 11, marginTop: 8 }}>
            Supported: MP3, WAV, OGG. The track will loop continuously.
          </p>
        </div>
      </div>
    </div>
  );
}
