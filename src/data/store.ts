/**
 * Invitation data store — the single source of truth for the entire
 * application. Both the admin panel and the public invitation read
 * from this store.
 *
 * Persistence is localStorage-based for development. The store exposes
 * a subscribe() mechanism so React components re-render when data
 * changes (admin edits reflect immediately in preview/public views).
 *
 * When a backend is added later, only this file's internals change —
 * admin UI and public invitation components remain untouched.
 */

import type { InvitationData } from "./invitation";
import { invitation as defaultInvitation } from "./invitation";

const STORAGE_KEY = "neozy-invi:invitation-data";

type Listener = (data: InvitationData) => void;

/**
 * Merge persisted data over the current defaults so a cached copy from
 * an older schema (missing newly-added fields like event.motif or
 * rsvp.guestCountEnabled) still renders correctly and never throws.
 * Objects are merged one level deep; arrays and scalars from storage
 * win outright.
 */
function reconcile(stored: unknown): InvitationData {
  const base = structuredClone(defaultInvitation);
  if (!stored || typeof stored !== "object") return base;
  const s = stored as Record<string, unknown>;
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as Array<keyof InvitationData>) {
    const sv = s[key];
    if (sv === undefined || sv === null) continue;
    const bv = base[key];
    if (Array.isArray(sv) || typeof sv !== "object") {
      out[key] = sv;
    } else if (bv && typeof bv === "object" && !Array.isArray(bv)) {
      out[key] = { ...(bv as object), ...(sv as object) };
    } else {
      out[key] = sv;
    }
  }
  return out as unknown as InvitationData;
}

/* ── Legacy asset-path migration ──────────────────────────────
   Before the Theme 1 reorganisation, media lived at /video/, /audio/
   and /fonts/ (some with different filenames). A browser whose
   localStorage holds an invitation saved back then would keep
   requesting the DELETED paths (persisted data wins over defaults).
   This rewrites any known legacy path to its new location so old
   saved data — music.src, venue.image, event images, gallery entries —
   keeps working without the user clearing storage. Strings that merely
   start with an old prefix but are not a known file are left alone. */
const LEGACY_ASSET_PATHS: Record<string, string> = {
  "/video/couple-bg.mp4": "/themes/theme-1/videos/couple-background.mp4",
  "/video/gate-cinematic.mp4": "/themes/theme-1/videos/gate-cinematic.mp4",
  "/video/poster.jpg": "/themes/theme-1/images/cover.jpg",
  "/video/couple-poster.jpg": "/themes/theme-1/images/couple-poster.jpg",
  "/video/ganeshaicon.png": "/themes/theme-1/images/ganesha.png",
  "/video/scratch.png": "/themes/theme-1/images/scratch.png",
  "/video/wedding-hands.png": "/themes/theme-1/images/wedding-hands.png",
  "/audio/newsong.mp3": "/themes/theme-1/audio/wedding-music.mp3",
  "/fonts/telma/Telma-Bold.woff2": "/themes/theme-1/fonts/telma/Telma-Bold.woff2",
};

function migrateLegacyPaths(value: unknown, changed = { hit: false }): unknown {
  if (typeof value === "string") {
    const next = LEGACY_ASSET_PATHS[value];
    if (next !== undefined) {
      changed.hit = true;
      return next;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => migrateLegacyPaths(v, changed));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = migrateLegacyPaths(v, changed);
    }
    return out;
  }
  return value;
}

function load(): InvitationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = reconcile(JSON.parse(raw));
      const changed = { hit: false };
      const migrated = migrateLegacyPaths(data, changed) as InvitationData;
      // persist the clean copy once, only if a legacy path was actually
      // rewritten — otherwise leave storage untouched
      if (changed.hit) persist(migrated);
      return migrated;
    }
  } catch {
    // Corrupted data — fall back to defaults.
  }
  return structuredClone(defaultInvitation);
}

function persist(data: InvitationData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — in-memory state still works.
  }
}

let current: InvitationData = load();
const listeners: Set<Listener> = new Set();

export const invitationStore = {
  /** Get current invitation data (read-only snapshot). */
  get(): InvitationData {
    return current;
  },

  /**
   * Update invitation data. Accepts a partial merge (patch) or a full
   * replacement. Notifies all subscribers after the update.
   */
  set(data: InvitationData): void {
    current = data;
    persist(current);
    listeners.forEach((fn) => fn(current));
  },

  /** Patch specific top-level fields without replacing the whole object. */
  patch(partial: Partial<InvitationData>): void {
    current = { ...current, ...partial };
    persist(current);
    listeners.forEach((fn) => fn(current));
  },

  /** Subscribe to data changes. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Reset to factory defaults (used by admin "reset" action). */
  reset(): void {
    current = structuredClone(defaultInvitation);
    persist(current);
    listeners.forEach((fn) => fn(current));
  },
};
