"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store";
import { setUser, clearUser } from "@/store/slices/auth.slice";
import { authKeys } from "@/features/auth/api/auth.queries";

function isValidAdmin(value: unknown): value is PublicAdmin {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<PublicAdmin>;
  return (
    typeof r.id === "string" &&
    typeof r.email === "string" &&
    typeof r.firstName === "string" &&
    typeof r.lastName === "string"
  );
}

/**
 * Restores the Super Admin session from localStorage. Unlike a resident
 * demo, the admin console never auto-signs-in — the login screen is shown
 * until credentials are entered.
 */
export default function AuthRehydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loggedOut = localStorage.getItem("caia.logged-out") === "true";
    const stored = localStorage.getItem("auth-user");

    if (!loggedOut && stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (isValidAdmin(parsed)) {
          dispatch(setUser(parsed));
          queryClient.setQueryData(authKeys.currentUser, parsed);
          document.cookie = `auth-token=demo-token-${parsed.id}; path=/; max-age=1209600; SameSite=Lax`;
          return;
        }
      } catch {
        // fall through
      }
    }
    dispatch(clearUser());
    queryClient.setQueryData(authKeys.currentUser, null);
  }, [dispatch, queryClient]);

  return <>{children}</>;
}
