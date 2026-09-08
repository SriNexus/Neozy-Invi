import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { EventData, RsvpConfig } from "../data/invitation";
import { rsvpService } from "../services/rsvp";
import { useActiveTheme } from "../data/useTheme";
import { Divider, ThemeCorner } from "./decor/Ornaments";

type Phase = "form" | "submitting" | "confirmed" | "declined";

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,253,248,0.75)",
  border: "1px solid rgba(184,148,63,0.3)",
  borderRadius: 2,
  color: "var(--text-primary)",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "var(--text-secondary)",
  fontFamily: "var(--font-sc)",
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};

export default function RsvpSection({
  config,
  events,
}: {
  config: RsvpConfig;
  events: EventData[];
}) {
  const theme = useActiveTheme();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!config.enabled) return null;

  const maxGuests = config.maxGuests ?? 6;

  const toggleEvent = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please share your name.");
    if (attending === null) return setError("Please let us know if you can join.");
    setPhase("submitting");
    try {
      await rsvpService.submit({
        name: name.trim(),
        phone: phone.trim(),
        attending,
        guestCount: config.guestCountEnabled && attending ? guestCount : undefined,
        events: Array.from(selected),
        message: message.trim() || undefined,
      });
      setPhase(attending ? "confirmed" : "declined");
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("form");
    }
  };

  return (
    <section
      className="relative w-full"
      style={{ padding: "clamp(64px,12vw,110px) clamp(20px,5vw,40px)" }}
    >
      <div
        ref={ref}
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}
      >
        {phase === "confirmed" && (
          <Frame corner={theme.motifs.corner}>
            <div className="text-center">
              <WaxSeal />
              <h2
                className="mt-6"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--text-primary)",
                  fontSize: "clamp(26px,7vw,38px)",
                }}
              >
                With joy
              </h2>
              <p style={{ color: "var(--text-secondary)", fontStyle: "italic", marginTop: 12, lineHeight: 1.6 }}>
                Your reply is on its way to us.
              </p>
              {config.message && (
                <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginTop: 10 }}>{config.message}</p>
              )}
            </div>
          </Frame>
        )}

        {phase === "declined" && (
          <Frame corner={theme.motifs.corner}>
            <div className="text-center">
              <Divider emblem={theme.motifs.divider} width={120} className="mb-5" />
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--text-primary)",
                  fontSize: "clamp(24px,6.5vw,34px)",
                }}
              >
                You'll be missed
              </h2>
              <p style={{ color: "var(--text-secondary)", fontStyle: "italic", marginTop: 12, lineHeight: 1.6 }}>
                Thank you for letting us know — you'll be in our hearts on the day.
              </p>
            </div>
          </Frame>
        )}

        {(phase === "form" || phase === "submitting") && (
          <Frame corner={theme.motifs.corner}>
            <Heading kicker="Réponse" title="Kindly reply" emblem={theme.motifs.divider} />

            <form onSubmit={submit} className="mt-8 space-y-6">
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  style={fieldStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Phone <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 00000 00000"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Will you join us?</label>
                <div className="flex gap-3">
                  {[
                    { v: true, label: "Joyfully accepts" },
                    { v: false, label: "Regretfully declines" },
                  ].map((opt) => {
                    const on = attending === opt.v;
                    return (
                      <button
                        key={String(opt.v)}
                        type="button"
                        onClick={() => setAttending(opt.v)}
                        className="flex-1 py-3 px-2"
                        style={{
                          background: on ? "rgba(184,148,63,0.14)" : "rgba(255,253,248,0.5)",
                          border: `1px solid ${on ? "var(--gold-invite)" : "rgba(184,148,63,0.25)"}`,
                          borderRadius: 2,
                          color: on ? "var(--gold-invite)" : "var(--text-secondary)",
                          fontFamily: "var(--font-sc)",
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          transition: "all 0.25s ease",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {attending === true && config.guestCountEnabled && (
                <div>
                  <label style={labelStyle}>How many will attend?</label>
                  <div className="flex items-center gap-4">
                    <Stepper
                      value={guestCount}
                      min={1}
                      max={maxGuests}
                      onChange={setGuestCount}
                    />
                    <span style={{ color: "var(--text-tertiary)", fontSize: 13, fontStyle: "italic" }}>
                      {guestCount === 1 ? "just me" : `${guestCount} of us`}
                    </span>
                  </div>
                </div>
              )}

              {attending === true && events.length > 0 && (
                <div>
                  <label style={labelStyle}>Which celebrations?</label>
                  <div className="space-y-2">
                    {events.map((ev) => {
                      const on = selected.has(ev.id);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => toggleEvent(ev.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                          style={{
                            background: on ? "rgba(184,148,63,0.1)" : "rgba(255,253,248,0.4)",
                            border: `1px solid ${on ? "rgba(184,148,63,0.45)" : "rgba(184,148,63,0.18)"}`,
                            borderRadius: 2,
                          }}
                        >
                          <span
                            className="flex items-center justify-center shrink-0"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              border: `1px solid ${on ? "var(--gold-invite)" : "rgba(184,148,63,0.4)"}`,
                              background: on ? "var(--gold-invite)" : "transparent",
                            }}
                          >
                            {on && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span style={{ color: "var(--text-primary)", fontSize: 14 }}>
                            {ev.name}
                            <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                              {"  ·  "}{ev.time}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>A note for the couple <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your blessing or wishes…"
                  rows={3}
                  style={{ ...fieldStyle, resize: "none" }}
                />
              </div>

              {error && (
                <p role="alert" style={{ color: "#a8574f", fontSize: 13, textAlign: "center", fontStyle: "italic" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={phase === "submitting"}
                className="w-full py-3.5"
                style={{
                  background: "linear-gradient(135deg, var(--gold-invite), var(--gold-invite-light))",
                  color: "#1c1408",
                  fontFamily: "var(--font-sc)",
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  borderRadius: 2,
                  opacity: phase === "submitting" ? 0.7 : 1,
                  cursor: phase === "submitting" ? "wait" : "pointer",
                }}
              >
                {phase === "submitting" ? "Sealing…" : "Seal & send"}
              </button>
            </form>
          </Frame>
        )}
      </div>
    </section>
  );
}

const FRAME_CORNERS = ["tl", "tr", "br", "bl"] as const;

function Frame({
  corner,
  children,
}: {
  corner: "floret" | "peacock" | "arabesque";
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative paper-grain mx-auto"
      style={{
        maxWidth: "min(92vw, 520px)",
        padding: "clamp(28px,7vw,48px) clamp(20px,6vw,44px)",
        background: "linear-gradient(158deg, rgba(252,249,242,0.9), rgba(244,236,220,0.86))",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 2px 6px rgba(90,70,40,0.1), 0 18px 44px rgba(70,52,26,0.2)",
        borderRadius: 2,
      }}
    >
      <div className="absolute" style={{ inset: 10, border: "1px solid var(--gold-invite)", opacity: 0.45 }} />
      {FRAME_CORNERS.map((c) => (
        <span
          key={c}
          className="absolute"
          style={{
            ...(c === "tl" ? { top: -6, left: -6 } : {}),
            ...(c === "tr" ? { top: -6, right: -6 } : {}),
            ...(c === "br" ? { bottom: -6, right: -6 } : {}),
            ...(c === "bl" ? { bottom: -6, left: -6 } : {}),
          }}
        >
          <ThemeCorner variant={corner} corner={c} size={30} />
        </span>
      ))}
      <div className="relative">{children}</div>
    </div>
  );
}

function Heading({
  kicker,
  title,
  emblem,
}: {
  kicker: string;
  title: string;
  emblem: "lotus" | "star" | "geometric";
}) {
  return (
    <div className="text-center">
      <span
        className="font-sc"
        style={{
          color: "var(--gold-invite-dim)",
          fontSize: "clamp(10px,2.5vw,12px)",
          letterSpacing: "0.45em",
          textTransform: "uppercase",
        }}
      >
        {kicker}
      </span>
      <h2
        className="mt-3"
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          color: "var(--text-primary)",
          fontSize: "clamp(26px,7vw,38px)",
          fontWeight: 500,
        }}
      >
        {title}
      </h2>
      <Divider emblem={emblem} width={140} className="mt-4" />
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const btn: React.CSSProperties = {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(184,148,63,0.4)",
    color: "var(--gold-invite)",
    background: "rgba(255,253,248,0.5)",
    fontSize: 18,
    lineHeight: 1,
  };
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      <button type="button" style={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Fewer guests">
        –
      </button>
      <span
        style={{
          minWidth: 44,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 22,
          color: "var(--text-primary)",
          borderTop: "1px solid rgba(184,148,63,0.4)",
          borderBottom: "1px solid rgba(184,148,63,0.4)",
          height: 34,
          lineHeight: "34px",
        }}
      >
        {value}
      </span>
      <button type="button" style={btn} onClick={() => onChange(Math.min(max, value + 1))} aria-label="More guests">
        +
      </button>
    </div>
  );
}

function WaxSeal() {
  return (
    <div className="flex justify-center" style={{ animation: "revealPop 0.6s cubic-bezier(0.22,1,0.36,1) both" }}>
      <span
        className="flex items-center justify-center"
        style={{
          width: 66,
          height: 66,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 34%, #c98a3f, #9a3f2c 70%, #7c2f22)",
          boxShadow: "0 6px 18px rgba(120,40,25,0.35), inset 0 2px 6px rgba(255,255,255,0.25)",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,240,225,0.9)" strokeWidth="1.3" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </span>
    </div>
  );
}
