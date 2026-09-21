import { useState } from "react";
import { useInvitationStore } from "../../data/useStore";
import { invitationStore } from "../../data/store";
import type { InvitationData } from "../../data/invitation";

/**
 * Invitation edit page — manage couple names, wedding date, venue,
 * closing message, and contact details. All changes flow through the
 * store and are immediately visible in Preview / public invitation.
 */

export default function AdminEdit() {
  const invitation = useInvitationStore();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<InvitationData>(invitation);

  const updateCouple = (field: string, value: string | string[]) => {
    setDraft((prev) => ({ ...prev, couple: { ...prev.couple, [field]: value } }));
    setSaved(false);
  };

  const updateWedding = (field: string, value: string) => {
    setDraft((prev) => ({ ...prev, wedding: { ...prev.wedding, [field]: value } }));
    setSaved(false);
  };

  const updateVenue = (field: string, value: string) => {
    setDraft((prev) => ({ ...prev, venue: { ...prev.venue, [field]: value } }));
    setSaved(false);
  };

  const updateClosing = (field: string, value: string) => {
    setDraft((prev) => ({ ...prev, closing: { ...prev.closing, [field]: value } }));
    setSaved(false);
  };

  const updateContact = (field: string, value: string) => {
    setDraft((prev) => ({ ...prev, contact: { ...prev.contact, [field]: value } }));
    setSaved(false);
  };

  const handleSave = () => {
    invitationStore.set(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Edit Invitation</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>Update your invitation details.</p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#c9a869", color: "#141210" }}
        >
          {saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Couple */}
        <Section title="Couple">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Groom's Name (shown right)">
              <input
                value={draft.couple.name1}
                onChange={(e) => updateCouple("name1", e.target.value)}
                className="admin-input"
              />
            </Field>
            <Field label="Bride's Name (shown left)">
              <input
                value={draft.couple.name2}
                onChange={(e) => updateCouple("name2", e.target.value)}
                className="admin-input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Groom's Parents">
              <input
                value={draft.couple.groomParents || ""}
                onChange={(e) => updateCouple("groomParents", e.target.value)}
                placeholder="S/o Mr. & Mrs. Sharma"
                className="admin-input"
              />
            </Field>
            <Field label="Bride's Parents">
              <input
                value={draft.couple.brideParents || ""}
                onChange={(e) => updateCouple("brideParents", e.target.value)}
                placeholder="D/o Mr. & Mrs. Verma"
                className="admin-input"
              />
            </Field>
          </div>
        </Section>

        {/* Wedding */}
        <Section title="Wedding Date & Time">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date">
              <input
                type="date"
                value={draft.wedding.date}
                onChange={(e) => updateWedding("date", e.target.value)}
                className="admin-input"
              />
            </Field>
            <Field label="Time">
              <input
                value={draft.wedding.time || ""}
                onChange={(e) => updateWedding("time", e.target.value)}
                placeholder="10:00 AM"
                className="admin-input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Display Date">
              <input
                value={draft.wedding.displayDate || ""}
                onChange={(e) => updateWedding("displayDate", e.target.value)}
                placeholder="Saturday, 12th December"
                className="admin-input"
              />
            </Field>
            <Field label="Display Venue">
              <input
                value={draft.wedding.displayVenue || ""}
                onChange={(e) => updateWedding("displayVenue", e.target.value)}
                placeholder="Bengaluru · India"
                className="admin-input"
              />
            </Field>
          </div>
        </Section>

        {/* Venue */}
        <Section title="Venue">
          <Field label="Venue Name">
            <input
              value={draft.venue.name}
              onChange={(e) => updateVenue("name", e.target.value)}
              className="admin-input"
            />
          </Field>
          <Field label="Address">
            <input
              value={draft.venue.address}
              onChange={(e) => updateVenue("address", e.target.value)}
              className="admin-input"
            />
          </Field>
          <Field label="Directions URL">
            <input
              value={draft.venue.directionsUrl || ""}
              onChange={(e) => updateVenue("directionsUrl", e.target.value)}
              placeholder="https://maps.google.com/..."
              className="admin-input"
            />
          </Field>
        </Section>

        {/* Closing */}
        <Section title="Closing Message">
          <Field label="Message">
            <textarea
              value={draft.closing.message}
              onChange={(e) => updateClosing("message", e.target.value)}
              rows={3}
              className="admin-input"
            />
          </Field>
          <Field label="Family Sign-off">
            <input
              value={draft.closing.familyMessage || ""}
              onChange={(e) => updateClosing("familyMessage", e.target.value)}
              placeholder="With love — Abhay, Gunjan & our families"
              className="admin-input"
            />
          </Field>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                value={draft.contact.phone || ""}
                onChange={(e) => updateContact("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className="admin-input"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={draft.contact.whatsapp || ""}
                onChange={(e) => updateContact("whatsapp", e.target.value)}
                placeholder="919876543210"
                className="admin-input"
              />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-5 border"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      <h2 className="text-sm font-medium mb-4" style={{ color: "#e7d3a0" }}>{title}</h2>
      <div className="space-y-4">{children}</div>
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
