import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Emblem } from "./decor/Ornaments";
import { useActiveTheme } from "../data/useTheme";

interface Unit {
  label: string;
  value: number;
  pad: number;
}

function timeLeft(target: Date): { units: Unit[]; done: boolean } {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return {
      done: true,
      units: [
        { label: "Days", value: 0, pad: 2 },
        { label: "Hours", value: 0, pad: 2 },
        { label: "Minutes", value: 0, pad: 2 },
        { label: "Seconds", value: 0, pad: 2 },
      ],
    };
  }
  return {
    done: false,
    units: [
      { label: "Days", value: Math.floor(diff / 86400000), pad: 2 },
      { label: "Hours", value: Math.floor((diff / 3600000) % 24), pad: 2 },
      { label: "Minutes", value: Math.floor((diff / 60000) % 60), pad: 2 },
      { label: "Seconds", value: Math.floor((diff / 1000) % 60), pad: 2 },
    ],
  };
}

/** THE BOX — a premium ivory/warm-white dimensional card, one per unit.
 *  Explicitly requested: the countdown was reading as merging into the
 *  artwork with no separation of its own; these boxes are the fix. A
 *  deliberate, named exception to the project's "no cards" convention,
 *  same standing as the Couple scene's own past exceptions — asked for
 *  by name, for this one purpose.
 *
 *  Built to feel like a small piece of raised wedding stationery resting
 *  ON the artwork, never a website card: a warm ivory gradient surface
 *  (never flat white), a hairline antique-gold border, and layered
 *  shadows doing the dimensional work — a soft inner highlight along the
 *  top edge (light catching a raised surface), a soft inner shadow along
 *  the bottom edge (the same edge's own shade), and a close, warm outer
 *  drop shadow lifting the whole box off the background. No
 *  backdrop-filter anywhere (that reads as glass, and this is paper/
 *  card stock), no heavy dark UI shadow, no glow. */
const BOX_STYLE: CSSProperties = {
  background: "linear-gradient(160deg, #fffdf8 0%, #f6efe1 100%)",
  border: "1px solid rgba(184,148,63,0.4)",
  borderRadius: "clamp(10px, 1.8vw, 14px)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -2px 3px rgba(120,92,45,0.1), 0 2px 4px rgba(60,42,16,0.14), 0 10px 20px rgba(60,42,16,0.2)",
};

export default function Countdown({
  targetDate,
  visible = false,
}: {
  targetDate: Date;
  visible?: boolean;
}) {
  const theme = useActiveTheme();
  const [state, setState] = useState(() => timeLeft(targetDate));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setState(timeLeft(targetDate));
    timer.current = setInterval(() => setState(timeLeft(targetDate)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [visible, targetDate]);

  if (!visible) return null;

  if (state.done) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Emblem kind={theme.motifs.divider} size={18} />
        <span
          style={{
            fontFamily: "var(--font-engrave)",
            color: "var(--text-primary)",
            fontSize: "clamp(16px,4.4vw,24px)",
            letterSpacing: "0.16em",
            marginLeft: "0.16em",
            textTransform: "uppercase",
            textShadow:
              "0 1px 1px rgba(40,28,16,0.14), 0 1px 14px rgba(250,244,234,0.5)",
          }}
        >
          Today is the day
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center" style={{ gap: "clamp(12px,2.2vh,18px)" }}>
      <span
        style={{
          fontFamily: "var(--font-invite-label)",
          fontWeight: 500,
          color: "var(--gold-invite-dim)",
          fontSize: "clamp(13px,3.4vw,16px)",
          letterSpacing: "0.36em",
          marginLeft: "0.36em",
          textTransform: "uppercase",
          textShadow: "0 1px 10px rgba(250,244,234,0.5)",
        }}
      >
        Until We Celebrate
      </span>

      {/* Four premium white 3D boxes, clearly separated from the artwork
          behind them (see BOX_STYLE above) — the fix for the countdown
          "merging into the background". Numerals are dark charcoal (NOT
          gold — gold-on-ivory read too low-contrast to be "very
          readable") with a refined antique-gold TOUCH carried only in
          the shadow beneath the glyph, so the dimensional warmth reads
          without sacrificing legibility. Everything here grew again
          this pass — numerals AND, per an explicit correction, the
          DAYS/HOURS/MINUTES/SECONDS labels, which had stayed too small
          even as the numerals grew — to fill the artwork's own much
          larger open lower field (see DateReveal's LAYOUT note: the
          countdown's stage is now a generous, unbroken ≈22dvh, not the
          ≈15dvh a previous pass budgeted against the old artwork). */}
      <div className="flex items-center justify-center" style={{ gap: "clamp(10px,2.8vw,18px)" }}>
        {state.units.map((u) => (
          <div
            key={u.label}
            className="flex flex-col items-center justify-center"
            style={{
              ...BOX_STYLE,
              minWidth: "clamp(64px,17vw,96px)",
              padding: "clamp(10px,1.8dvh,15px) clamp(6px,1.8vw,10px)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-couple)",
                fontOpticalSizing: "auto",
                fontVariationSettings: '"opsz" 72, "SOFT" 20, "WONK" 0',
                color: "#241f18",
                fontSize: "clamp(32px,9vw,46px)",
                lineHeight: 1,
                fontWeight: 600,
                letterSpacing: "0.01em",
                fontVariantNumeric: "lining-nums tabular-nums",
                textShadow:
                  "0 1px 0 rgba(255,252,240,0.75), 0 2px 5px rgba(139,111,50,0.3)",
              }}
            >
              {String(u.value).padStart(u.pad, "0")}
            </span>
            <span
              style={{
                fontFamily: "var(--font-invite-label)",
                fontWeight: 600,
                marginTop: "clamp(4px,0.8vh,7px)",
                color: "var(--gold-invite-dim)",
                fontSize: "clamp(12px,3vw,15px)",
                letterSpacing: "0.1em",
                marginLeft: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
