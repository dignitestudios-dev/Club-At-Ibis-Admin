"use client";

import { useCurrentUserQuery } from "@/features/auth/api/auth.queries";
import { useAppSelector } from "@/store";

export function useCurrentUser(): PublicAdmin | null {
  const { data } = useCurrentUserQuery();
  const reduxUser = useAppSelector((state) => state.auth.user);
  // Prefer the redux session (set on login / rehydrate); the query is a fallback.
  return reduxUser ?? (data ?? null);
}
