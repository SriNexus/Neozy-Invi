/**
 * Theme system — drives the complete visual language of the invitation.
 *
 * Each theme defines: palette, typography, decorative elements, animation
 * treatment, and section presentation. Changing a theme transforms the
 * entire invitation's feel, not just its colors.
 *
 * The architecture supports one reusable Section Engine with
 * ThemeConfig-driven presentation — NOT five separate codebases.
 */

export interface ThemePalette {
  ink: string;
  inkDeep: string;
  ivory: string;
  ivoryDim: string;
  gold: string;
  goldSoft: string;
  goldDim: string;
  cardBg: string;
  cardBgWarm: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  goldInvite: string;
  goldInviteLight: string;
  goldInviteDim: string;
  accent: string;
}

export interface ThemeFonts {
  /** Large hero / names — a display serif */
  display: string;
  /** Elegant script accent */
  script: string;
  /** Body copy */
  body: string;
  /** Small-caps / label serif */
  sc: string;
}

export interface ThemeAssets {
  /**
   * The single persistent cinematic wallpaper that lives behind the
   * Couple Card + Date Reveal experience only. Theme-owned, never
   * hardcoded in a component.
   */
  wallpaperVideo: string;
  wallpaperPoster: string;
}

export interface ThemeMotifs {
  /** Corner ornament style for framed compositions */
  corner: "floret" | "peacock" | "arabesque";
  /** Section-divider emblem style */
  divider: "lotus" | "star" | "geometric";
  /** Emblem family for event chapters */
  eventEmblems: "ceremony" | "geometric";
}

export interface ThemeLayout {
  /** Couple-card composition */
  coupleCard: "framed-panel" | "open-serif";
  /** Events section rhythm */
  events: "alternating-timeline" | "stacked-chapters";
  /** Venue treatment when no photo is supplied */
  venueFallback: "jharokha" | "minimal";
}

export interface ThemeConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  palette: ThemePalette;
  fonts: ThemeFonts;
  assets: ThemeAssets;
  motifs: ThemeMotifs;
  layout: ThemeLayout;
  /**
   * Opaque background for the "second visual world" — everything after
   * the Date Reveal (Countdown → Events → Venue → Photos → RSVP →
   * Closing). The wallpaper video is gone by this point; this is what
   * the guest sees behind those sections.
   */
  paperWorld: string;
  /** Decorative density: "minimal" | "moderate" | "ornate" */
  ornamentation: "minimal" | "moderate" | "ornate";
  /** Animation intensity: "subtle" | "standard" | "expressive" */
  motion: "subtle" | "standard" | "expressive";
}

/** Shared defaults so a theme only overrides what makes it distinct. */
const BASE: Pick<ThemeConfig, "fonts" | "assets" | "motifs" | "layout" | "paperWorld"> = {
  fonts: {
    display: "'Playfair Display', serif",
    script: "'Cormorant Garamond', serif",
    body: "'Cormorant Garamond', serif",
    sc: "'Cormorant SC', serif",
  },
  // Theme 1 media lives under public/themes/theme-1/ so a future Theme 2
  // can bring its own images/videos/audio/fonts without restructuring the
  // application. Every theme below currently shares this base set.
  assets: {
    wallpaperVideo: "/themes/theme-1/videos/couple-background.mp4",
    // A still of the couple film on its settled final frame (≈20s in) —
    // so the fallback / pre-buffer frame is the same painted jharokha the
    // film resolves to, never the gate envelope.
    wallpaperPoster: "/themes/theme-1/images/couple-poster.jpg",
  },
  motifs: { corner: "floret", divider: "lotus", eventEmblems: "ceremony" },
  layout: {
    coupleCard: "framed-panel",
    events: "alternating-timeline",
    venueFallback: "jharokha",
  },
  paperWorld:
    "radial-gradient(ellipse 80% 50% at 50% 0%, #fbf7ee 0%, #f3ecdc 55%, #ece1c9 100%)",
};

export const themes: Record<string, ThemeConfig> = {
  "classic-gold": {
    id: "classic-gold",
    name: "Classic Gold",
    category: "Hindu",
    description: "Timeless gold on ivory with ornamental framing.",
    palette: {
      ink: "#0b0c0e",
      inkDeep: "#06070a",
      ivory: "#f4efe4",
      ivoryDim: "#cfc7b6",
      gold: "#c9a869",
      goldSoft: "#e3cd9a",
      goldDim: "#8a7449",
      cardBg: "#faf7f0",
      cardBgWarm: "#f5f0e4",
      textPrimary: "#2c2520",
      textSecondary: "#6b5e50",
      textTertiary: "#9a8c7a",
      goldInvite: "#b8943f",
      goldInviteLight: "#d4b86a",
      goldInviteDim: "#a08540",
      accent: "rgba(200, 170, 100, 0.15)",
    },
    ...structuredClone(BASE),
    ornamentation:"ornate",
    motion: "standard",
  },
  "royal-maroon": {
    id: "royal-maroon",
    name: "Royal Maroon",
    category: "Hindu",
    description: "Deep maroon and gold with rich textures.",
    palette: {
      ink: "#0a0505",
      inkDeep: "#030101",
      ivory: "#f5ede0",
      ivoryDim: "#d4c8b8",
      gold: "#d4af37",
      goldSoft: "#e8d48a",
      goldDim: "#9a7d2a",
      cardBg: "#faf3e8",
      cardBgWarm: "#f5e8d4",
      textPrimary: "#2a1515",
      textSecondary: "#6b4545",
      textTertiary: "#9a7575",
      goldInvite: "#b8860b",
      goldInviteLight: "#daa520",
      goldInviteDim: "#8b6914",
      accent: "rgba(212, 175, 55, 0.15)",
    },
    ...structuredClone(BASE),
    // Theme 02 proves the architecture: a theme is not a colour swap.
    // Different display type, script accent, corner motif, event rhythm
    // and venue treatment — all driven from here, no component edits.
    fonts: {
      display: "'Playfair Display', serif",
      script: "'Cormorant Garamond', serif",
      body: "'Cormorant Garamond', serif",
      sc: "'Cormorant SC', serif",
    },
    motifs: { corner: "arabesque", divider: "geometric", eventEmblems: "geometric" },
    layout: {
      coupleCard: "framed-panel",
      events: "stacked-chapters",
      venueFallback: "minimal",
    },
    paperWorld:
      "radial-gradient(ellipse 80% 50% at 50% 0%, #2a1515 0%, #1c0d0d 60%, #120707 100%)",
    ornamentation: "ornate",
    motion: "expressive",
  },
  "garden-pastel": {
    id: "garden-pastel",
    name: "Garden Pastel",
    category: "Hindu",
    description: "Soft pastels with botanical motifs.",
    palette: {
      ink: "#0f1210",
      inkDeep: "#080a09",
      ivory: "#f8f4ee",
      ivoryDim: "#d8d0c4",
      gold: "#c9b896",
      goldSoft: "#e0d4b8",
      goldDim: "#8a7e60",
      cardBg: "#faf8f4",
      cardBgWarm: "#f4f0e8",
      textPrimary: "#2f3b2a",
      textSecondary: "#5a6b50",
      textTertiary: "#8a9a7a",
      goldInvite: "#a8943f",
      goldInviteLight: "#c4b86a",
      goldInviteDim: "#807540",
      accent: "rgba(180, 160, 120, 0.12)",
    },
    ...structuredClone(BASE),
    ornamentation:"moderate",
    motion: "subtle",
  },
  "emerald-mughal": {
    id: "emerald-mughal",
    name: "Emerald Mughal",
    category: "Muslim",
    description: "Emerald green with geometric Islamic patterns.",
    palette: {
      ink: "#060f0a",
      inkDeep: "#020503",
      ivory: "#f0f4ec",
      ivoryDim: "#c8d0c0",
      gold: "#c9a227",
      goldSoft: "#e0c878",
      goldDim: "#8a6d1a",
      cardBg: "#f6faf4",
      cardBgWarm: "#ecf4e8",
      textPrimary: "#1a2e1a",
      textSecondary: "#4a6b4a",
      textTertiary: "#7a9a7a",
      goldInvite: "#9a8020",
      goldInviteLight: "#baa84a",
      goldInviteDim: "#706020",
      accent: "rgba(201, 162, 39, 0.12)",
    },
    ...structuredClone(BASE),
    ornamentation:"ornate",
    motion: "standard",
  },
  "arabesque-blue": {
    id: "arabesque-blue",
    name: "Arabesque Blue",
    category: "Muslim",
    description: "Sapphire blue with arabesque detailing.",
    palette: {
      ink: "#060a14",
      inkDeep: "#02040a",
      ivory: "#eef2f8",
      ivoryDim: "#c4ccd8",
      gold: "#e8d5a3",
      goldSoft: "#f0e4c8",
      goldDim: "#a08a60",
      cardBg: "#f4f8fc",
      cardBgWarm: "#e8f0f8",
      textPrimary: "#1a2535",
      textSecondary: "#4a5a70",
      textTertiary: "#7a8a9a",
      goldInvite: "#b8a450",
      goldInviteLight: "#d4c87a",
      goldInviteDim: "#908040",
      accent: "rgba(232, 213, 163, 0.12)",
    },
    ...structuredClone(BASE),
    ornamentation:"ornate",
    motion: "standard",
  },
};

export function getTheme(themeId: string): ThemeConfig {
  return themes[themeId] || themes["classic-gold"];
}
