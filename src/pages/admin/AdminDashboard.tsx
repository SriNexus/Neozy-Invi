import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useInvitationStore } from "../../data/useStore";
import { useRsvpSubmissions } from "../../services/rsvp";

/**
 * Admin dashboard — operational overview of the invitation at a glance.
 */

function daysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AdminDashboard() {
  const invitation = useInvitationStore();
  const submissions = useRsvpSubmissions();

  const weddingDate = useMemo(() => {
    const [y, m, d] = invitation.wedding.date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [invitation.wedding.date]);

  const days = daysUntil(weddingDate);
  const attending = submissions.filter((s) => s.attending).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4efe4" }}>Dashboard</h1>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
            Welcome back. Here's your invitation overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/preview"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "rgba(201,168,105,0.15)", color: "#e7d3a0" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </Link>
          <Link
            to="/admin/edit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#c9a869", color: "#141210" }}
          >
            Edit Invitation
          </Link>
        </div>
      </div>

      {/* Status banner */}
      <div
        className="rounded-lg px-4 py-3 mb-6 flex items-center gap-3"
        style={{
          background: invitation.settings.published ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
          border: `1px solid ${invitation.settings.published ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: invitation.settings.published ? "#22c55e" : "#eab308" }}
        />
        <span style={{ color: invitation.settings.published ? "#86efac" : "#fde047", fontSize: 13 }}>
          {invitation.settings.published ? "Invitation is live and publicly visible." : "Invitation is in draft — not visible to guests."}
        </span>
        <Link
          to="/admin/settings"
          className="ml-auto text-sm underline"
          style={{ color: invitation.settings.published ? "#86efac" : "#fde047" }}
        >
          Manage
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Wedding Date"
          value={weddingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          sub={days > 0 ? `${days} days to go` : days === 0 ? "Today!" : "Past"}
        />
        <StatCard
          label="Events"
          value={String(invitation.events.length)}
          sub={invitation.events.length === 1 ? "event" : "events"}
        />
        <StatCard
          label="RSVPs"
          value={String(submissions.length)}
          sub={`${attending} attending`}
        />
        <StatCard
          label="Gallery"
          value={String(invitation.gallery.length)}
          sub={invitation.gallery.length === 1 ? "photo" : "photos"}
        />
      </div>

      {/* Public URL */}
      <div
        className="rounded-lg p-4 border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ color: "#9ca3af", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Public URL</span>
          <Link to="/admin/settings" style={{ color: "#e7d3a0", fontSize: 12 }}>Edit slug</Link>
        </div>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 px-3 py-2 rounded text-sm"
            style={{ background: "rgba(0,0,0,0.3)", color: "#e7d3a0" }}
          >
            /{invitation.settings.slug}
          </code>
          <Link
            to={`/${invitation.settings.slug}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded text-sm"
            style={{ background: "rgba(201,168,105,0.12)", color: "#e7d3a0" }}
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      <p style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ color: "#f4efe4" }}>{value}</p>
      <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>{sub}</p>
    </div>
  );
}
