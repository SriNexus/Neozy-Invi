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

/**
 * One event page's artwork.
 *
 * `ground` is the full-bleed painting that page is set on. `motif` is an
 * optional TRANSPARENT artwork laid over it — the invitation's own
 * Ganesha, joined hands or gold sheet — which turns a page into a
 * devotional / union / gold-leaf variation of the same painting. All the
 * framing lives here, so a ceremony's artwork is pure data and a
 * component never knows a path.
 */
export interface EventWallpaper {
  ground: string;
  /** which part of the ground the page frames (`object-position`) */
  groundPosition?: string;
  /** a transparent artwork laid over the ground */
  motif?: string;
  /** the motif's width, as a share of the page width */
  motifWidth?: string;
  /** the motif's offset from the top of the page */
  motifTop?: string;
  /** how strongly the motif reads — it is a watermark, never the subject */
  motifOpacity?: number;
}

export interface ThemeAssets {
  /**
   * The Date Reveal scene's OWN background — a dedicated "Save the Date"
   * composition (currently a layered scalloped-frame illustration with a
   * blank ivory panel for the scratch/date, and a blank pink pedestal
   * panel beneath it for the countdown), distinct from the Couple scene's
   * gate-film background. `DateReveal.tsx` positions its scratch/date
   * stage and its countdown against this specific image's measured
   * geometry (see that file's header comment) — swapping this asset for
   * one with a different
   * composition would require re-measuring those positions.
   */
  dateRevealPoster: string;
  /**
   * The Celebrations chapter's artwork, keyed by the ceremony's MOTIF
   * (`motifForEvent()` in decor/Ornaments): mehendi / haldi / sangeet /
   * wedding / reception → ONE permanently-applied painting per ceremony
   * (see `EVENT_BACKGROUNDS`). It is rendered once, statically, as that
   * page's full-screen background — nothing rotates, crossfades or
   * re-mounts it. A ceremony with no entry keeps the printed paper page.
   */
  eventBackgrounds: Record<string, EventWallpaper>;
  /**
   * The Venue section's artwork. Used only when the invitation carries no
   * `venue.image` of its own — an uploaded/venue-specific photograph always
   * wins. Theme-owned so the section never hardcodes a path.
   */
  venueImage: string;
  /** The closing page's artwork — the invitation's own cover art, closing
   *  the book it opened. */
  closingImage: string;
  /**
   * The album's pages, shown in this order while the couple hasn't
   * uploaded their own gallery yet (`invitation.gallery` is empty by
   * default — an admin upload replaces this list automatically, see
   * CouplePhotoExperience.tsx). ONE entry = ONE full-screen scene.
   * Theme-owned, so no component hardcodes an image path.
   *
   * Currently the five real couple photographs (`couple1–5.jpg`),
   * ordered by hand after visually inspecting all five — NOT by
   * filename number. Ranked on composition, both faces/figures genuinely
   * visible, image quality, and emotional/storytelling value:
   *   1. couple4.jpg — full traditional attire, henna-decorated hands
   *      intertwined, tender forehead-touch, sharp focus, best overall.
   *   2. couple3.jpg — genuine candid laughter, most emotionally
   *      immediate moment of the five.
   *   3. couple1.jpg — intimate golden-hour close-up, warm backlit glow.
   *   4. couple2.jpg — elegant full-body rooftop portrait; strong on its
   *      own, ranked here mainly because its pastel palette/mood reads
   *      as a different shoot from the other four's traditional red/gold
   *      wedding attire.
   *   5. couple5.jpg — beautiful bridal portrait, but a SOLO shot (the
   *      groom is not in frame at all, not merely cropped) — weakest fit
   *      for a couple-photo album specifically, kept last.
   */
  albumArt: string[];
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

/** where every theme-1 image lives — kept in one place so a ceremony's
 *  own artwork is a filename away */
const IMG = "/themes/theme-1/images/";

/* ─────────────────────────────────────────────────────────────
   Each ceremony's OWN artwork — ONE painting per event, permanently.

   These are ordinary files in `public/themes/theme-1/images/`: replace
   `haldi-background.jpg` (or any of the others) and that ceremony's page
   shows the new painting, with no code change. Filenames are explicitly
   section-scoped (`<ceremony>-background.jpg`) rather than bare ceremony
   names, so a future Super Admin asset manager can present "Haldi
   background" as an unambiguous, named upload slot rather than a mystery
   filename shared with nothing else.

   DELIBERATELY STATIC. Nothing here rotates, crossfades, re-mounts on
   scroll or cycles on a timer: the artwork a ceremony is given is the
   artwork its page always shows (rendered by `EventBackdrop` in
   EventsSection.tsx). That is what keeps an event background fixed and
   persistent across renders — an earlier per-ceremony image CAROUSEL is
   what made the background appear to change or reset on its own.

   A ceremony with no entry here keeps the printed paper page.
   ───────────────────────────────────────────────────────────── */
const EVENT_BACKGROUNDS: Record<string, EventWallpaper> = {
  mehendi: { ground: `${IMG}mehendi-background.jpg` },
  sangeet: { ground: `${IMG}sangeet-background.jpg` },
  haldi: { ground: `${IMG}haldi-background.jpg` },
  wedding: { ground: `${IMG}wedding-background.jpg` },
  reception: { ground: `${IMG}reception-background.jpg` },
};

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
    // The Date Reveal scene's own artwork — see the ThemeAssets doc above.
    dateRevealPoster: `${IMG}save-the-date-background.jpg`,
    // The Celebrations chapter: ONE painting per ceremony, keyed by motif
    // (see EVENT_BACKGROUNDS). Replacing a file in
    // public/themes/theme-1/images/ updates that ceremony's page.
    eventBackgrounds: { ...EVENT_BACKGROUNDS },
    // The Venue section's own artwork (used only when the invitation has no
    // venue photograph of its own). Now a real supplied photograph —
    // `venue.jpg` (a wide night shot of the decorated venue building and
    // lawn) — replacing the earlier empty placeholder that made the
    // Venue section silently render its "no-photo" jharokha fallback for
    // every visitor.
    venueImage: `${IMG}venue.jpg`,
    // The closing page's artwork: `endsection.jpg`, a dedicated ivory/
    // cream decorative stationery border (gold filigree, hanging lamps,
    // floral garlands, a maroon peacock band) with an already-blank
    // cream centre for the closing text to sit on — no longer the
    // `cover.jpg` copy this once was. Swap the file to update it;
    // nothing else needs to change.
    closingImage: `${IMG}endsection.jpg`,
    // The album's pages, until the couple uploads their own gallery — see
    // the ThemeAssets.albumArt doc comment above for the ranking rationale.
    albumArt: [
      `${IMG}couple4.jpg`,
      `${IMG}couple3.jpg`,
      `${IMG}couple1.jpg`,
      `${IMG}couple2.jpg`,
      `${IMG}couple5.jpg`,
    ],
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
