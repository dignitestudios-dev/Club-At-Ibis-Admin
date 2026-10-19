"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SearchResetListener = (clearedKey?: string) => void;
const searchResetListeners = new Set<SearchResetListener>();

function notifySearchReset(clearedKey?: string) {
  searchResetListeners.forEach((listener) => {
    try {
      listener(clearedKey);
    } catch {
      // ignore
    }
  });
}

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
    (patch: Partial<T> & { q?: string; search?: string }) => {
      const params = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        const valStr = v === undefined ? "" : String(v).trim();
        if (v === undefined || valStr === "" || valStr === defaultsRef.current[k]) {
          params.delete(k);
          if (k === "q" || k === "search") {
            notifySearchReset(k);
          }
        } else {
          params.set(k, valStr);
        }
      }
      const qs = params.toString();
      // router.replace (not history.replaceState) so useSearchParams updates and the UI reacts.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  /**
   * Atomically resets all filters and clears search parameters in a single URL update,
   * guaranteeing that search and filter resets never race or require multiple clicks.
   */
  const resetAll = useCallback(
    (patch?: Partial<T>, options?: { searchParamKey?: string }) => {
      const searchKey = options?.searchParamKey ?? "q";
      notifySearchReset(searchKey);
      notifySearchReset("search");

      const params = new URLSearchParams(window.location.search);
      params.delete(searchKey);
      params.delete("search");
      params.delete("page");

      for (const k of Object.keys(defaultsRef.current)) {
        params.delete(k);
      }

      if (patch) {
        for (const [k, v] of Object.entries(patch)) {
          const valStr = v === undefined ? "" : String(v).trim();
          if (v === undefined || valStr === "" || valStr === defaultsRef.current[k]) {
            params.delete(k);
          } else {
            params.set(k, valStr);
          }
        }
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  return { values, set, resetAll };
}

import { useDebounce } from "@/hooks/use-debounce";

/** Debounced text search that mirrors itself into the `q` URL param. */
export function useUrlSearch(paramKey = "q", delay = 1000) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const urlValue = searchParams.get(paramKey) ?? "";
  const [text, setText] = useState(urlValue.trim());
  const debounced = useDebounce(text, delay);
  // Clearing applies at once; only typing is debounced.
  const debouncedText = text.trim() === "" ? "" : debounced;
  const lastWritten = useRef(urlValue.trim());

  // Listen for programmatic resetAll / clear events to immediately synchronize text and suppress duplicate router.replace
  useEffect(() => {
    const listener: SearchResetListener = (clearedKey) => {
      if (!clearedKey || clearedKey === paramKey) {
        lastWritten.current = "";
        setText("");
      }
    };
    searchResetListeners.add(listener);
    return () => {
      searchResetListeners.delete(listener);
    };
  }, [paramKey]);

  // Adopt external URL changes (back button, links carrying ?q=).
  useEffect(() => {
    const trimmedUrl = urlValue.trim();
    if (trimmedUrl !== lastWritten.current) {
      lastWritten.current = trimmedUrl;
      setText(trimmedUrl);
    }
  }, [urlValue]);

  useEffect(() => {
    const trimmed = debouncedText.trim();
    if (trimmed === lastWritten.current) return;
    lastWritten.current = trimmed;
    const params = new URLSearchParams(window.location.search);
    if (trimmed) params.set(paramKey, trimmed);
    else params.delete(paramKey);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedText, paramKey, pathname, router]);

  return [text, setText] as const;
}
