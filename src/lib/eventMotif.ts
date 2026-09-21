/** Infer a motif key from an event when none is set (no emoji fallback).
 *  Moved out of `decor/Ornaments.tsx` (a component-only file) so that
 *  file can keep Fast Refresh working — a plain function exported
 *  alongside components broke it. */
export function motifForEvent(e: { motif?: string; id?: string; name?: string }): string {
  if (e.motif) return e.motif;
  const hay = `${e.id ?? ""} ${e.name ?? ""}`.toLowerCase();
  for (const k of ["mehendi", "haldi", "sangeet", "reception", "wedding", "blessing"]) {
    if (hay.includes(k)) return k;
  }
  if (hay.includes("engage") || hay.includes("roka")) return "wedding";
  if (hay.includes("tilak") || hay.includes("puja") || hay.includes("pooja")) return "blessing";
  return "lotus";
}
