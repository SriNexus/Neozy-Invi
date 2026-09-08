import { useEffect, useMemo } from "react";
import { useInvitationStore } from "./useStore";
import { getTheme } from "./themes";
import type { ThemeConfig } from "./themes";

/**
 * Applies the selected theme's palette, typography and world backgrounds
 * as CSS custom properties on the document root. This is what makes theme
 * selection actually transform the invitation's visual language — every
 * component reads from these variables and from the ThemeConfig object,
 * so changing theme re-skins typography, motifs, layout and animation,
 * not just colours.
 */
export function useThemeApplication() {
  const invitation = useInvitationStore();

  useEffect(() => {
    const theme = getTheme(invitation.settings.themeId);
    const root = document.documentElement;
    const p = theme.palette;

    root.style.setProperty("--ink", p.ink);
    root.style.setProperty("--ink-deep", p.inkDeep);
    root.style.setProperty("--ivory", p.ivory);
    root.style.setProperty("--ivory-dim", p.ivoryDim);
    root.style.setProperty("--gold", p.gold);
    root.style.setProperty("--gold-soft", p.goldSoft);
    root.style.setProperty("--gold-dim", p.goldDim);
    root.style.setProperty("--card-bg", p.cardBg);
    root.style.setProperty("--card-bg-warm", p.cardBgWarm);
    root.style.setProperty("--text-primary", p.textPrimary);
    root.style.setProperty("--text-secondary", p.textSecondary);
    root.style.setProperty("--text-tertiary", p.textTertiary);
    root.style.setProperty("--gold-invite", p.goldInvite);
    root.style.setProperty("--gold-invite-light", p.goldInviteLight);
    root.style.setProperty("--gold-invite-dim", p.goldInviteDim);
    root.style.setProperty("--accent-glow", p.accent);

    root.style.setProperty("--font-display", theme.fonts.display);
    root.style.setProperty("--font-script", theme.fonts.script);
    root.style.setProperty("--font-body", theme.fonts.body);
    root.style.setProperty("--font-sc", theme.fonts.sc);

    root.style.setProperty("--paper-world", theme.paperWorld);

    // Theme metadata as data attributes for CSS selectors
    root.dataset.themeId = theme.id;
    root.dataset.themeMotion = theme.motion;
    root.dataset.themeOrnament = theme.ornamentation;
  }, [invitation.settings.themeId]);
}

/** The full active ThemeConfig — for components that switch composition,
 *  motif set or layout variant based on the theme, not just colour. */
export function useActiveTheme(): ThemeConfig {
  const invitation = useInvitationStore();
  return useMemo(
    () => getTheme(invitation.settings.themeId),
    [invitation.settings.themeId],
  );
}
