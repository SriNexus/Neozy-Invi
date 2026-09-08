import { useEffect, useRef, useState } from "react";
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
    <div className="flex flex-col items-center" style={{ gap: "clamp(12px,2.6vh,18px)" }}>
      <span
        style={{
          fontFamily: "var(--font-invite-label)",
          fontWeight: 500,
          color: "var(--gold-invite-dim)",
          fontSize: "clamp(9px,2.4vw,10.5px)",
          letterSpacing: "0.44em",
          marginLeft: "0.44em",
          textTransform: "uppercase",
          textShadow: "0 1px 10px rgba(250,244,234,0.5)",
        }}
      >
        Until We Celebrate
      </span>

      {/* No cards, no boxes, no digital-clock styling. The figures are
          set in the SAME identity serif as the date numeral above (the
          calm, refined side of Fraunces — SOFT, no WONK), so the countdown
          reads as printed on the same invitation as the date. Elegant
          numerals carry the eye; the labels are a clear step quieter; the
          gap between units breathes so the four figures read as
          "99   10   08   48" rather than a squeezed digital readout.
          Footprint stays within the same safe area as before. */}
      <div className="flex items-start justify-center" style={{ gap: "clamp(18px,6vw,34px)" }}>
        {state.units.map((u) => (
          <div key={u.label} className="flex flex-col items-center" style={{ minWidth: "1.5em" }}>
            <span
              style={{
                fontFamily: "var(--font-couple)",
                fontOpticalSizing: "auto",
                fontVariationSettings: '"opsz" 72, "SOFT" 30, "WONK" 0',
                color: "var(--text-primary)",
                fontSize: "clamp(28px,8.4vw,38px)",
                lineHeight: 1,
                fontWeight: 500,
                letterSpacing: "0.01em",
                fontVariantNumeric: "lining-nums tabular-nums",
                textShadow:
                  "0 1px 1px rgba(40,28,16,0.14), 0 1px 14px rgba(250,244,234,0.45)",
              }}
            >
              {String(u.value).padStart(u.pad, "0")}
            </span>
            <span
              style={{
                fontFamily: "var(--font-invite-label)",
                fontWeight: 500,
                marginTop: "clamp(8px,1.6vh,12px)",
                color: "var(--text-tertiary)",
                fontSize: "clamp(7px,1.9vw,9px)",
                letterSpacing: "0.3em",
                marginLeft: "0.3em",
                textTransform: "uppercase",
                opacity: 0.8,
                textShadow: "0 1px 8px rgba(250,244,234,0.45)",
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
