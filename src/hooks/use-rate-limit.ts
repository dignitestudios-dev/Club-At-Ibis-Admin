"use client";

import { useCallback, useEffect, useState } from "react";

type RateLimitError = Error & { code?: string; statusCode?: number; responseData?: unknown };

/**
 * How long to wait, in seconds, when the login API throttles us. Two shapes exist:
 * - RATE_LIMITED (HTTP 429): `details.retryAfterSeconds` is a number of seconds.
 * - AUTHENTICATION_THROTTLED (repeated failed logins): `details.retryAfter` is an ISO date/time to retry at.
 * Returns null for any other error, or when no usable wait time is present.
 */
export function getRetryAfterSeconds(error: unknown, now: number = Date.now()): number | null {
  const e = error as RateLimitError | null;
  if (!e) return null;
  const data = e.responseData as { code?: string; details?: { retryAfterSeconds?: unknown; retryAfter?: unknown } } | undefined;
  const code = e.code ?? data?.code;
  const throttled = code === "RATE_LIMITED" || code === "AUTHENTICATION_THROTTLED" || e.statusCode === 429;
  if (!throttled) return null;

  const secs = Number(data?.details?.retryAfterSeconds);
  if (Number.isFinite(secs) && secs > 0) return Math.ceil(secs);

  const at = data?.details?.retryAfter;
  if (typeof at === "string" || typeof at === "number") {
    const ms = new Date(at).getTime() - now;
    if (Number.isFinite(ms) && ms > 0) return Math.ceil(ms / 1000);
  }
  return null;
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

  /** Stops and forgets the countdown (the backend is no longer throttling us). */
  const clear = useCallback(() => {
    setUntil(null);
    setRestored(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  /**
   * Call from a failed request. Returns true when it was a throttle with a wait time (so the caller can skip
   * its own error toast) and (re)starts the countdown from the backend. When the backend answered with
   * anything else (wrong password, validation, etc.) the throttle is over, so a running countdown is removed.
   * A network failure or a 5xx tells us nothing about the throttle, so the countdown keeps running.
   */
  const handleError = useCallback(
    (error: unknown): boolean => {
      const secs = getRetryAfterSeconds(error);
      if (secs === null) {
        const status = (error as RateLimitError | null)?.statusCode;
        // A 429 without a usable wait time is still a throttle: leave any running countdown alone.
        if (typeof status === "number" && status !== 429 && status < 500) clear();
        return false;
      }
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
    [storageKey, clear]
  );

  const remaining = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  return { remaining, isLimited: remaining > 0, restored, handleError, clear };
}
