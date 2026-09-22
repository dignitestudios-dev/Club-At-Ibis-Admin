"use client";

import { useCallback, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const KEY = "caia.page-size";
const DEFAULT_PAGE_SIZE = 50;

function read(): number {
  try {
    const n = Number(window.localStorage.getItem(KEY));
    return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/** Table page size, remembered across pages and visits. */
export function usePageSize() {
  const [pageSize, setSize] = useState<number>(() => (typeof window === "undefined" ? DEFAULT_PAGE_SIZE : read()));
  const setPageSize = useCallback((n: number) => {
    setSize(n);
    try {
      window.localStorage.setItem(KEY, String(n));
    } catch {
      // ignore
    }
  }, []);
  return [pageSize, setPageSize] as const;
}
