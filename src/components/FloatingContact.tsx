import { useState } from "react";
import type { ContactData } from "../data/invitation";

/**
 * Floating contact control — a discreet bottom-left dock revealing
 * WhatsApp and Call actions. Phone/WhatsApp destinations come from
 * invitation data, never hardcoded.
 *
 * Positioned bottom-left to avoid collision with the music toggle
 * (bottom-right).
 */

export default function FloatingContact({ contact }: { contact: ContactData }) {
  const [open, setOpen] = useState(false);

  const hasPhone = !!contact.phone;
  const hasWhatsapp = !!contact.whatsapp;

  if (!hasPhone && !hasWhatsapp) return null;

  const whatsappUrl = hasWhatsapp
    ? `https://wa.me/${contact.whatsapp?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'm responding to the wedding invitation.")}`
    : undefined;

  const phoneUrl = hasPhone ? `tel:${contact.phone}` : undefined;

  return (
    <div
      className="fixed z-50"
      style={{
        bottom: "max(20px, env(safe-area-inset-bottom))",
        left: "max(20px, env(safe-area-inset-left))",
      }}
    >
      {/* Expanded actions */}
      <div
        className="flex flex-col gap-2 mb-2"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(10px)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-full"
            style={{
              background: "rgba(37, 211, 102, 0.15)",
              border: "1px solid rgba(37, 211, 102, 0.3)",
              color: "#25d366",
              fontSize: 12,
              fontFamily: "'Cormorant SC', serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
              backdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
            }}
            aria-label="Chat on WhatsApp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        )}

        {phoneUrl && (
          <a
            href={phoneUrl}
            className="flex items-center gap-2 px-3 py-2 rounded-full"
            style={{
              background: "rgba(201,168,105,0.12)",
              border: "1px solid rgba(201,168,105,0.3)",
              color: "var(--gold-soft)",
              fontSize: 12,
              fontFamily: "'Cormorant SC', serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
              backdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
            }}
            aria-label="Call us"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call
          </a>
        )}
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close contact options" : "Open contact options"}
        aria-expanded={open}
        className="flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md active:scale-95"
        style={{
          background: open ? "rgba(201,168,105,0.2)" : "rgba(0,0,0,0.3)",
          border: "1px solid rgba(201,168,105,0.4)",
          color: "var(--gold-soft)",
          transition: "background 0.3s ease",
        }}
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
        )}
      </button>
    </div>
  );
}
