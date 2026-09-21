"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps list state (search, filters, tab, page) in the URL so it survives
 * refreshes, back/forward navigation and shared links. Values equal to their
 * default are removed from the query string to keep URLs short.
 */
export function useUrlParams<T extends Record<string, string>>(defaults: T) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const defaultsRef = useRef(defaults);
  const key = searchParams.toString();

  const values = useMemo(() => {
    const params = new URLSearchParams(key);
    const out = {} as Record<string, string>;
    for (const k of Object.keys(defaultsRef.current)) out[k] = params.get(k) ?? defaultsRef.current[k];
    return out as T;
  }, [key]);

  const set = useCallback(
    (patch: Partial<T>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || v === defaultsRef.current[k]) params.delete(k);
        else params.set(k, String(v));
      }
      const qs = params.toString();
      // router.replace (not history.replaceState) so useSearchParams updates and the UI reacts.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  return { values, set };
}

/** Debounced text search that mirrors itself into the `q` URL param. */
export function useUrlSearch(paramKey = "q", delay = 250) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const urlValue = searchParams.get(paramKey) ?? "";
  const [text, setText] = useState(urlValue);
  const lastWritten = useRef(urlValue);

  // Adopt external URL changes (back button, links carrying ?q=).
  useEffect(() => {
    if (urlValue !== lastWritten.current) {
      lastWritten.current = urlValue;
      setText(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    if (text === lastWritten.current) return;
    const id = setTimeout(() => {
      lastWritten.current = text;
      const params = new URLSearchParams(window.location.search);
      if (text) params.set(paramKey, text);
      else params.delete(paramKey);
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, delay);
    return () => clearTimeout(id);
  }, [text, paramKey, pathname, delay, router]);

  return [text, setText] as const;
}
