import { useState } from "react";
import { useInvitationStore } from "../../data/useStore";
import { invitationStore } from "../../data/store";
import { useRsvpSubmissions } from "../../services/rsvp";

/**
 * RSVP management — view guest responses and configure RSVP settings.
 * Shows attendance summary, guest details, and which events they'll
 * attend.
 */

export default function AdminRsvp() {
  const invitation = useInvitationStore();
  const submissions = useRsvpSubmissions();
  const [showConfig, setShowConfig] = useState(false);

  const attending = submissions.filter((s) => s.attending);
  const declined = submissions.filter((s) => !s.attending);

  const toggleRsvp = () => {
    invitationStore.patch({
      rsvp: { ...invitation.rsvp, enabled: !invitation.rsvp.enabled },
    });
  };

  const updateRsvpMessage = (message: string) => {
    invitationStore.patch({ rsvp: { ...invitation.rsvp, message } });
  };

  const toggleGuestCount = () => {
    invitationStore.patch({
      rsvp: { ...invitation.rsvp, guestCountEnabled: !invitation.rsvp.guestCountEnabled },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>RSVP</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
            {submissions.length} {submissions.length === 1 ? "response" : "responses"} received
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "rgba(201,168,105,0.12)", color: "#e7d3a0" }}
        >
          {showConfig ? "View Responses" : "Settings"}
        </button>
      </div>

      {showConfig ? (
        <div
          className="rounded-lg p-5 border space-y-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: "#f4efe4" }}>Enable RSVP</p>
              <p style={{ color: "#6b7280", fontSize: 12 }}>Allow guests to respond to your invitation.</p>
            </div>
            <button
              onClick={toggleRsvp}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: invitation.rsvp.enabled ? "#c9a869" : "rgba(255,255,255,0.1)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: invitation.rsvp.enabled ? "22px" : "2px" }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: "#f4efe4" }}>Ask for guest count</p>
              <p style={{ color: "#6b7280", fontSize: 12 }}>Let attendees say how many people are coming.</p>
            </div>
            <button
              onClick={toggleGuestCount}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: invitation.rsvp.guestCountEnabled ? "#c9a869" : "rgba(255,255,255,0.1)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: invitation.rsvp.guestCountEnabled ? "22px" : "2px" }}
              />
            </button>
          </div>
          <label className="block">
            <span className="block text-xs mb-1.5" style={{ color: "#9ca3af" }}>Confirmation Message</span>
            <input
              value={invitation.rsvp.message || ""}
              onChange={(e) => updateRsvpMessage(e.target.value)}
              placeholder="We can't wait to celebrate with you!"
              className="admin-input"
            />
          </label>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div
              className="rounded-lg p-3 border text-center"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <p className="text-2xl font-semibold" style={{ color: "#86efac" }}>{attending.length}</p>
              <p style={{ color: "#6b7280", fontSize: 11 }}>Attending</p>
            </div>
            <div
              className="rounded-lg p-3 border text-center"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <p className="text-2xl font-semibold" style={{ color: "#fca5a5" }}>{declined.length}</p>
              <p style={{ color: "#6b7280", fontSize: 11 }}>Declined</p>
            </div>
            <div
              className="rounded-lg p-3 border text-center col-span-2 sm:col-span-1"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <p className="text-2xl font-semibold" style={{ color: "#f4efe4" }}>{submissions.length}</p>
              <p style={{ color: "#6b7280", fontSize: 11 }}>Total</p>
            </div>
          </div>

          {/* Responses list */}
          {submissions.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center border"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <p style={{ color: "#6b7280" }}>No RSVP responses yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg p-4 border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: "#f4efe4" }}>
                        {s.name}
                        {s.attending && s.guestCount ? (
                          <span style={{ color: "#9ca3af", fontSize: 12, fontWeight: 400 }}>
                            {"  ·  "}party of {s.guestCount}
                          </span>
                        ) : null}
                      </p>
                      {s.phone && (
                        <p style={{ color: "#6b7280", fontSize: 12 }}>{s.phone}</p>
                      )}
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: s.attending ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: s.attending ? "#86efac" : "#fca5a5",
                      }}
                    >
                      {s.attending ? "Attending" : "Declined"}
                    </span>
                  </div>
                  {s.attending && s.events.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.events.map((eventId) => {
                        const event = invitation.events.find((e) => e.id === eventId);
                        return (
                          <span
                            key={eventId}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ background: "rgba(201,168,105,0.1)", color: "#e7d3a0" }}
                          >
                            {event?.name || eventId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {s.message && (
                    <p className="mt-2 text-sm italic" style={{ color: "#9ca3af" }}>
                      "{s.message}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
