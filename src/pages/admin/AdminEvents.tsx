import { useState } from "react";
import { useInvitationStore } from "../../data/useStore";
import { invitationStore } from "../../data/store";
import type { EventData } from "../../data/invitation";

/**
 * Events management — full CRUD for wedding events. Supports unlimited
 * events with date, time, venue, motif, and directions.
 */

export default function AdminEvents() {
  const invitation = useInvitationStore();
  const [editing, setEditing] = useState<EventData | null>(null);
  const [isNew, setIsNew] = useState(false);

  const blankEvent = (): EventData => ({
    id: `evt_${Date.now()}`,
    name: "",
    date: invitation.wedding.date,
    time: "",
    venue: invitation.venue.name,
    address: invitation.venue.address,
    motif: "",
    directionsUrl: invitation.venue.directionsUrl,
  });

  const MOTIFS = ["", "mehendi", "haldi", "sangeet", "wedding", "reception", "blessing", "lotus"];

  const handleNew = () => {
    setEditing(blankEvent());
    setIsNew(true);
  };

  const handleEdit = (event: EventData) => {
    setEditing({ ...event });
    setIsNew(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this event?")) return;
    invitationStore.patch({
      events: invitation.events.filter((e) => e.id !== id),
    });
  };

  const handleSave = () => {
    if (!editing) return;
    if (isNew) {
      invitationStore.patch({ events: [...invitation.events, editing] });
    } else {
      invitationStore.patch({
        events: invitation.events.map((e) => (e.id === editing.id ? editing : e)),
      });
    }
    setEditing(null);
    setIsNew(false);
  };

  const moveEvent = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= invitation.events.length) return;
    const events = [...invitation.events];
    const [moved] = events.splice(index, 1);
    events.splice(newIndex, 0, moved);
    invitationStore.patch({ events });
  };

  // Edit modal
  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>
            {isNew ? "New Event" : "Edit Event"}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(null); setIsNew(false); }}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "#9ca3af" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#c9a869", color: "#141210" }}
            >
              {isNew ? "Add Event" : "Save Changes"}
            </button>
          </div>
        </div>

        <div
          className="rounded-lg p-5 border space-y-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Event Name">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Mehendi"
                className="admin-input"
              />
            </Field>
            <Field label="Decorative Motif">
              <select
                value={editing.motif || ""}
                onChange={(e) => setEditing({ ...editing, motif: e.target.value })}
                className="admin-input"
              >
                {MOTIFS.map((m) => (
                  <option key={m} value={m}>
                    {m ? m[0].toUpperCase() + m.slice(1) : "Auto (from name)"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date">
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label="Time (optional — leave blank if not yet confirmed)">
              <input
                value={editing.time || ""}
                onChange={(e) => setEditing({ ...editing, time: e.target.value || undefined })}
                placeholder="4:00 PM"
                className="admin-input"
              />
            </Field>
          </div>
          <Field label="Venue">
            <input
              value={editing.venue}
              onChange={(e) => setEditing({ ...editing, venue: e.target.value })}
              className="admin-input"
            />
          </Field>
          <Field label="Address">
            <input
              value={editing.address}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })}
              className="admin-input"
            />
          </Field>
          <Field label="Directions URL">
            <input
              value={editing.directionsUrl || ""}
              onChange={(e) => setEditing({ ...editing, directionsUrl: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="admin-input"
            />
          </Field>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Events</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
            {invitation.events.length} {invitation.events.length === 1 ? "event" : "events"} configured
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#c9a869", color: "#141210" }}
        >
          + Add Event
        </button>
      </div>

      {invitation.events.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center border"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <p style={{ color: "#6b7280" }}>No events yet. Add your first wedding event.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitation.events.map((event, i) => (
            <div
              key={event.id}
              className="rounded-lg p-4 border flex items-center gap-4"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(201,168,105,0.1)", color: "#e7d3a0", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}
              >
                {(event.motif || event.name || "•").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: "#f4efe4" }}>{event.name}</p>
                <p style={{ color: "#9ca3af", fontSize: 12 }}>
                  {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {event.time} · {event.venue}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => moveEvent(i, -1)}
                  disabled={i === 0}
                  className="p-1.5 rounded disabled:opacity-30"
                  style={{ color: "#9ca3af" }}
                  aria-label="Move up"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </button>
                <button
                  onClick={() => moveEvent(i, 1)}
                  disabled={i === invitation.events.length - 1}
                  className="p-1.5 rounded disabled:opacity-30"
                  style={{ color: "#9ca3af" }}
                  aria-label="Move down"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEdit(event)}
                  className="p-1.5 rounded"
                  style={{ color: "#e7d3a0" }}
                  aria-label="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="p-1.5 rounded"
                  style={{ color: "#ef4444" }}
                  aria-label="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1.5" style={{ color: "#9ca3af" }}>{label}</span>
      {children}
    </label>
  );
}
