"use client";

import { useCallback, useEffect, useState } from "react";

type RateLimitError = Error & { code?: string; statusCode?: number; responseData?: unknown };

/** Pulls `details.retryAfterSeconds` out of a RATE_LIMITED API error (null when it isn't one). */
export function getRetryAfterSeconds(error: unknown): number | null {
  const e = error as RateLimitError | null;
  if (!e || (e.code !== "RATE_LIMITED" && e.statusCode !== 429)) return null;
  const data = e.responseData as { details?: { retryAfterSeconds?: unknown } } | undefined;
  const secs = Number(data?.details?.retryAfterSeconds);
  return Number.isFinite(secs) && secs > 0 ? Math.ceil(secs) : null;
}

const RESTORED_MS = 6000;

/**
 * Live countdown for a backend rate limit. Call `handleError(error)` from the failed request: when the
 * response is RATE_LIMITED with `details.retryAfterSeconds` it (re)starts the countdown from the backend's
 * number, so every new attempt re-syncs with the server. When it reaches zero, `restored` is true for a few
 * seconds ("you can try again now"). Survives a page refresh.
 */
export function useRateLimit(storageKey: string) {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [restored, setRestored] = useState(false);

  // Resume a countdown that was running before a refresh.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved > Date.now()) {
        setNow(Date.now());
        setUntil(saved);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // storage unavailable: the timer simply won't survive a refresh
    }
  }, [storageKey]);

  // Tick once a second against the wall clock (so a throttled background tab can't drift).
  useEffect(() => {
    if (until === null) return;
    const tick = () => {
      const t = Date.now();
      if (t >= until) {
        setUntil(null);
        setRestored(true);
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      } else {
        setNow(t);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until, storageKey]);

  // The "you can try again" message disappears by itself.
  useEffect(() => {
    if (!restored) return;
    const id = setTimeout(() => setRestored(false), RESTORED_MS);
    return () => clearTimeout(id);
  }, [restored]);

  /** Returns true when the error was a rate limit with a wait time (so the caller can skip its own error toast). */
  const handleError = useCallback(
    (error: unknown): boolean => {
      const secs = getRetryAfterSeconds(error);
      if (secs === null) return false;
      const end = Date.now() + secs * 1000;
      setRestored(false);
      setNow(Date.now());
      setUntil(end);
      try {
        localStorage.setItem(storageKey, String(end));
      } catch {
        // ignore
      }
      return true;
    },
    [storageKey]
  );

  const remaining = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  return { remaining, isLimited: remaining > 0, restored, handleError };
}
