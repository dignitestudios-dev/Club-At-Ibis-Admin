"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store";
import { setUser, clearUser } from "@/store/slices/auth.slice";
import { authKeys } from "@/features/auth/api/auth.queries";
import { getCurrentUser } from "@/features/auth/api/auth.service";

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
 * Restores the Super Admin session on load. The cached copy in localStorage is
 * trusted immediately (so a protected page doesn't flash empty while a request
 * is in flight), then confirmed against the backend in the background.
 *
 * A token that's expired, revoked, or belongs to a now-deactivated account gets
 * a 401 from /admin/me — the axios response interceptor (lib/axios.ts) handles
 * that globally: clears the session and redirects to login. That same
 * interceptor also fires for a token that goes stale mid-session on any other
 * authenticated call, not just this one. Any other failure here (a network
 * blip, the backend being briefly unreachable) is left alone — the optimistic
 * session above stays in place rather than logging the admin out for something
 * that wasn't actually an auth problem.
 */
export default function AuthRehydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loggedOut = localStorage.getItem("caia.logged-out") === "true";
    const token = localStorage.getItem("auth-token");
    const stored = localStorage.getItem("auth-user");

    if (loggedOut || !token) {
      dispatch(clearUser());
      queryClient.setQueryData(authKeys.currentUser, null);
      return;
    }

    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (isValidAdmin(parsed)) {
          dispatch(setUser(parsed));
          queryClient.setQueryData(authKeys.currentUser, parsed);
          document.cookie = `auth-token=${token}; path=/; max-age=1209600; SameSite=Lax`;
        }
      } catch {
        // fall through — the validation call below corrects this either way
      }
    }

    // `fetchQuery` (not the raw service call) so this shares one request with
    // any other mounted `useCurrentUserQuery()` (e.g. the topbar user menu)
    // instead of both firing their own /admin/me — and so it dedupes with
    // itself under React Strict Mode's double-effect in dev.
    queryClient
      .fetchQuery({ queryKey: authKeys.currentUser, queryFn: getCurrentUser, staleTime: 60_000 })
      .then((admin) => {
        if (admin) {
          localStorage.setItem("auth-user", JSON.stringify(admin));
          dispatch(setUser(admin));
        }
      })
      .catch(() => {
        // A real 401 is already handled globally by the axios interceptor;
        // anything else just leaves the optimistic session above in place.
      });
  }, [dispatch, queryClient]);

  return <>{children}</>;
}
