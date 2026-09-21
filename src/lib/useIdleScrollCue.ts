import { useEffect, useRef, useState } from "react";
import { getLastActivity } from "./idleActivity";

const IDLE_MS = 7000;
const POLL_MS = 300;

/**
 * Shows a scene's idle arrow once ~7s pass with no guest interaction
 * ANYWHERE (the shared clock in `idleActivity.ts` — not a new listener
 * per scene) since this scene last became the active one.
 *
 * Scene-aware by construction: `active` is each caller's OWN existing
 * on-screen signal (the `inView` a scene already tracks for its reveal
 * animation), so entering a new scene resets the clock, and leaving one
 * hides its arrow immediately — never one global timer running through
 * the whole invitation.
 *
 * `suppressed` lets a scene hide the cue for its own reasons (a
 * transition in flight, a carousel mid-drag, a confirmation state) —
 * checked on every poll, so it can flip at any moment without waiting
 * for the next `active` change.
 */
export function useIdleScrollCue(active: boolean, suppressed = false): boolean {
  const [idle, setIdle] = useState(false);
  const enteredAtRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    enteredAtRef.current = performance.now();
    setIdle(false);
    const id = window.setInterval(() => {
      const idleSince = Math.max(enteredAtRef.current, getLastActivity());
      setIdle(performance.now() - idleSince >= IDLE_MS);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [active]);

  // masked by `active` here rather than resetting `idle` in the effect's
  // inactive branch — hides the cue the instant the scene deactivates
  // without an extra synchronous setState on that transition
  return active && idle && !suppressed;
}
