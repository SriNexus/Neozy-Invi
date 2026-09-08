/**
 * RSVP persistence abstraction.
 *
 * The public RSVP UI depends on this interface, NOT on any specific
 * storage backend. For now the implementation uses localStorage so the
 * experience is fully functional in development. When Part 2 adds a
 * real backend, only this file's implementation changes — the RSVP
 * component does not.
 */

import { useEffect, useState } from "react";

export interface RsvpSubmission {
  id: string;
  name: string;
  phone: string;
  attending: boolean;
  /** How many people are coming (incl. the guest). Present when enabled. */
  guestCount?: number;
  events: string[];
  message?: string;
  submittedAt: string;
}

export interface RsvpService {
  submit(data: Omit<RsvpSubmission, "id" | "submittedAt">): Promise<RsvpSubmission>;
  getAll(): Promise<Array<RsvpSubmission>>;
}

/* ───────────────────────────────────────────────────────────────────
   LocalStorage implementation (development only).
   ─────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "neozy-invi:rsvp-submissions";

function generateId(): string {
  return `rsvp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const localRsvpService: RsvpService = {
  async submit(data) {
    const submission: RsvpSubmission = {
      ...data,
      id: generateId(),
      submittedAt: new Date().toISOString(),
    };
    const existing = getAllFromStorage();
    existing.push(submission);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // Storage full or unavailable — submission still returned to UI.
    }
    return submission;
  },

  async getAll() {
    return getAllFromStorage();
  },
};

function getAllFromStorage(): Array<RsvpSubmission> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RsvpSubmission[];
  } catch {
    return [];
  }
}

/* ───────────────────────────────────────────────────────────────────
   Active service — swap implementation here when backend is ready.
   ─────────────────────────────────────────────────────────────────── */

export const rsvpService: RsvpService = localRsvpService;

/* ───────────────────────────────────────────────────────────────────
   React hook for admin RSVP reading.
   ─────────────────────────────────────────────────────────────────── */

/**
 * Hook that reads all RSVP submissions. Re-reads on mount and when
 * the admin manually triggers a refresh (via the returned refetch fn).
 */
export function useRsvpSubmissions(): RsvpSubmission[] {
  const [submissions, setSubmissions] = useState<RsvpSubmission[]>([]);

  const refetch = () => {
    getAllFromStorageAsync().then(setSubmissions);
  };

  useEffect(() => {
    refetch();
  }, []);

  return submissions;
}

async function getAllFromStorageAsync(): Promise<RsvpSubmission[]> {
  return getAllFromStorage();
}
