"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store";
import { setUser, clearUser } from "@/store/slices/auth.slice";
import { authKeys } from "@/features/auth/api/auth.queries";
import { getCurrentUser } from "@/features/auth/api/auth.service";

function isValidAdmin(value: unknown): value is PublicAdmin {
  if (!value || typeof value !== "object") return false;
  const a = value as Partial<PublicAdmin>;
  return (
    typeof a.id === "string" &&
    typeof a.email === "string" &&
    typeof a.firstName === "string"
  );
}

export default function AuthRehydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loggedOut = localStorage.getItem("carv.logged-out") === "true";
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
        }
      } catch {
        // ignore JSON parse errors
      }
    }

    queryClient
      .fetchQuery({ queryKey: authKeys.currentUser, queryFn: getCurrentUser, staleTime: 60_000 })
      .then((user) => {
        if (user) {
          localStorage.setItem("auth-user", JSON.stringify(user));
          dispatch(setUser(user));
        }
      })
      .catch(() => {
        // handeled by interceptor
      });
  }, [dispatch, queryClient]);

  return <>{children}</>;
}
