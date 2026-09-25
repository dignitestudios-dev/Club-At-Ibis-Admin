"use client";

import { useCallback, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_KEY = "caia.page-size";
const DEFAULT_PAGE_SIZE = 50;

function read(options: number[] = PAGE_SIZE_OPTIONS, defaultSize = DEFAULT_PAGE_SIZE, key = DEFAULT_KEY): number {
  try {
    const n = Number(window.localStorage.getItem(key));
    return options.includes(n) ? n : defaultSize;
  } catch {
    return defaultSize;
  }
}

/** Table or grid page size, remembered across pages and visits. */
export function usePageSize(
  options: number[] = PAGE_SIZE_OPTIONS,
  defaultSize = DEFAULT_PAGE_SIZE,
  key = DEFAULT_KEY
) {
  const [pageSize, setSize] = useState<number>(() =>
    typeof window === "undefined" ? defaultSize : read(options, defaultSize, key)
  );
  const setPageSize = useCallback(
    (n: number) => {
      setSize(n);
      try {
        window.localStorage.setItem(key, String(n));
      } catch {
        // ignore
      }
    },
    [key]
  );
  return [pageSize, setPageSize] as const;
}
