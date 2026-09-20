/**
 * Invitation data model — the single source of truth for the entire
 * public invitation. All sections read from this structured data;
 * nothing is hardcoded inside presentation components.
 *
 * This is intentionally decoupled from any backend. For now it is a
 * static module. When a real data layer (Firestore, API) is added in
 * Part 2, this module becomes the hydration target — components do not
 * change.
 */

export interface CoupleData {
  /** Groom — shown on the RIGHT of the couple introduction. */
  name1: string;
  /** Bride — shown on the LEFT of the couple introduction. */
  name2: string;
  /** Parent line under the bride's name (LEFT), e.g. "D/o Mr. & Mrs. Verma" */
  brideParents?: string;
  /** Parent line under the groom's name (RIGHT), e.g. "S/o Mr. & Mrs. Sharma" */
  groomParents?: string;
  /** Opening line above the names, e.g. "Together With Our Families" */
  header?: string;
  /** Elegant script accent line on the couple card, e.g. "are getting married" */
  scriptAccent?: string;
  /** One short supporting invitation line, e.g. "request the pleasure of your company" */
  inviteLine?: string;
  /** Body text lines below the names */
  body?: string[];
  tagline?: string;
}

export interface WeddingDate {
  /** ISO date string: "2026-12-04" */
  date: string;
  /** Display time — ALSO the actual source of the hour/minute used to
   *  build the real wedding `Date` (see `getWeddingDate` below): "6:00 PM" */
  time?: string;
  /** Formatted display date: "Friday, 4th December" */
  displayDate?: string;
  /** Formatted display venue line: "Bengaluru · India" */
  displayVenue?: string;
}

export interface EventData {
  id: string;
  name: string;
  /** ISO date string */
  date: string;
  /** Display time */
  time: string;
  venue: string;
  address: string;
  description?: string;
  /** Public URL or path */
  image?: string;
  /** Emoji or short motif (legacy — prefer `motif`) */
  icon?: string;
  /**
   * Decorative motif key that selects a hand-drawn SVG emblem for the
   * event (no emoji). One of: mehendi | haldi | sangeet | wedding |
   * reception | blessing | feast | ring | lotus. Falls back to a key
   * inferred from the event id / name, then to a generic emblem.
   */
  motif?: string;
  /** Google Maps / directions URL */
  directionsUrl?: string;
}

export interface VenueData {
  name: string;
  address: string;
  /** ISO date string for the main event */
  date?: string;
  time?: string;
  image?: string;
  mapUrl?: string;
  directionsUrl?: string;
}

export interface GalleryImage {
  id: string;
  /** Public URL or path */
  image: string;
  caption?: string;
}

export interface RsvpConfig {
  enabled: boolean;
  /** Phone number for RSVP */
  phone?: string;
  /** WhatsApp number (international, no +) */
  whatsapp?: string;
  /** Which events guests can select attendance for */
  events?: string[];
  message?: string;
  /** Whether guests can indicate how many people are coming */
  guestCountEnabled?: boolean;
  /** Upper bound for the guest-count stepper (default 6) */
  maxGuests?: number;
}

export interface ContactData {
  phone?: string;
  whatsapp?: string;
}

export interface ClosingData {
  message: string;
  familyMessage?: string;
}

export interface MusicConfig {
  /** URL or path to the background music file */
  src: string;
  /** Whether music is enabled */
  enabled: boolean;
}

export interface AdminSettings {
  /** Whether the invitation is visible to the public */
  published: boolean;
  /** Public URL slug (e.g. "abhay-gunjan") */
  slug: string;
  /** Selected theme ID */
  themeId: string;
}

export interface InvitationData {
  couple: CoupleData;
  wedding: WeddingDate;
  events: EventData[];
  venue: VenueData;
  gallery: GalleryImage[];
  rsvp: RsvpConfig;
  contact: ContactData;
  closing: ClosingData;
  music: MusicConfig;
  settings: AdminSettings;
}

/* ───────────────────────────────────────────────────────────────────
   Default invitation content.
   Replace with real data when connecting to a backend / admin panel.
   ─────────────────────────────────────────────────────────────────── */

export const invitation: InvitationData = {
  couple: {
    name1: "Abhay",
    name2: "Gunjan",
    brideParents: "D/o Mr. & Mrs. Verma",
    groomParents: "S/o Mr. & Mrs. Chaudhary",
    header: "Together with their families",
    scriptAccent: "are getting married",
    inviteLine: "request the pleasure of your company as they celebrate their wedding",
    body: [],
    tagline: "Two souls, one story",
  },
  wedding: {
    date: "2026-12-04",
    time: "6:00 PM",
    displayDate: "Friday, 4th December",
    displayVenue: "Bengaluru \u00B7 India",
  },
  events: [
    {
      id: "mehendi",
      name: "Mehendi",
      date: "2026-12-10",
      time: "4:00 PM",
      venue: "The Grand Palace",
      address: "MG Road, Bengaluru",
      description: "Let the henna tell our love story in shades of gold and crimson.",
      motif: "mehendi",
      directionsUrl: "https://maps.google.com/?q=MG+Road+Bengaluru",
    },
    {
      id: "sangeet",
      name: "Sangeet",
      date: "2026-12-11",
      time: "7:00 PM",
      venue: "The Grand Palace",
      address: "MG Road, Bengaluru",
      description: "An evening of music, dance, and celebrations under the stars.",
      motif: "sangeet",
      directionsUrl: "https://maps.google.com/?q=MG+Road+Bengaluru",
    },
    {
      id: "haldi",
      name: "Haldi",
      date: "2026-12-12",
      time: "9:00 AM",
      venue: "The Grand Palace",
      address: "MG Road, Bengaluru",
      description: "A splash of sunshine to bless the beginning of our new journey.",
      motif: "haldi",
      directionsUrl: "https://maps.google.com/?q=MG+Road+Bengaluru",
    },
    {
      id: "wedding",
      name: "Wedding",
      date: "2026-12-04",
      time: "6:00 PM",
      venue: "The Grand Palace",
      address: "MG Road, Bengaluru",
      description: "The moment we've been waiting for — when two hearts become one.",
      motif: "wedding",
      directionsUrl: "https://maps.google.com/?q=MG+Road+Bengaluru",
    },
    {
      id: "reception",
      name: "Reception",
      date: "2026-12-12",
      time: "7:00 PM",
      venue: "The Grand Palace",
      address: "MG Road, Bengaluru",
      description: "Dine, dance, and celebrate with us as we begin our forever.",
      motif: "reception",
      directionsUrl: "https://maps.google.com/?q=MG+Road+Bengaluru",
    },
  ],
  venue: {
    name: "The Grand Palace",
    address: "123 MG Road, Bengaluru, Karnataka 560001",
    date: "2026-12-04",
    time: "6:00 PM",
    directionsUrl: "https://maps.google.com/?q=MG+Road+Bengaluru",
  },
  gallery: [],
  rsvp: {
    enabled: true,
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
    message: "We can't wait to celebrate with you!",
    guestCountEnabled: true,
    maxGuests: 6,
  },
  contact: {
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
  },
  closing: {
    message: "Your presence is the only gift we need. Together with our families, we can't wait to celebrate our forever with you.",
    familyMessage: "With love — Abhay, Gunjan & our families",
  },
  music: {
    src: "/themes/theme-1/audio/wedding-music.mp3",
    enabled: true,
  },
  settings: {
    published: true,
    slug: "abhay-gunjan",
    themeId: "classic-gold",
  },
};

/* ───────────────────────────────────────────────────────────────────
   Derived helpers
   ─────────────────────────────────────────────────────────────────── */

/** Parse a display time like "6:00 PM" / "10:00 AM" into 24-hour
 *  hours/minutes. Falls back to midnight for a missing/unparseable
 *  string rather than a silently wrong guessed hour. */
function parseTimeOfDay(time: string | undefined): { hours: number; minutes: number } {
  const m = time && /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return { hours: 0, minutes: 0 };
  let hours = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) hours += 12;
  return { hours, minutes: Number(m[2]) };
}

/** The ONE source of truth for the wedding's actual date + time — every
 *  display (Save the Date, its countdown, the weekday shown anywhere)
 *  must derive from this, never a separately hardcoded hour. Previously
 *  hardcoded `10, 0, 0` regardless of `inv.wedding.time`, which silently
 *  desynced the countdown's real target from whatever time was shown as
 *  text — fixed to actually parse `inv.wedding.time`. */
export function getWeddingDate(inv: InvitationData): Date {
  const [y, m, d] = inv.wedding.date.split("-").map(Number);
  const { hours, minutes } = parseTimeOfDay(inv.wedding.time);
  return new Date(y, m - 1, d, hours, minutes, 0);
}

/** Parse an ISO "YYYY-MM-DD" into a local Date at midnight. */
export function parseEventDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
