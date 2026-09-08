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
 * an older schema (missing newly-added fields like couple.scriptAccent,
 * event.motif or rsvp.guestCountEnabled) still renders correctly and
 * never throws. Objects are merged one level deep; arrays and scalars
 * from storage win outright.
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

function load(): InvitationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return reconcile(JSON.parse(raw));
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
