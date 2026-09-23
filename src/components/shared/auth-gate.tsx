"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUserQuery } from "@/features/auth/api/auth.queries";
import { GlobalAuthLoader } from "@/components/shared/global-auth-loader";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearUser, setUser } from "@/store/slices/auth.slice";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector((state) => state.auth.user);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const {
    data: queryUser,
    isLoading: isQueryLoading,
    isError,
    isSuccess,
  } = useCurrentUserQuery();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loggedOut = localStorage.getItem("caia.logged-out") === "true";
    let token = localStorage.getItem("auth-token");

    if (!token) {
      const match = document.cookie.match(/(?:^|;\s*)auth-token=([^;]+)/);
      if (match && match[1] && !loggedOut) {
        token = match[1];
        localStorage.setItem("auth-token", token);
      }
    }

    if (loggedOut || !token) {
      setHasToken(false);
      dispatch(clearUser());
      const returnUrl = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/auth/login?returnUrl=${returnUrl}`);
    } else {
      setHasToken(true);
    }
  }, [router, pathname, dispatch]);

  useEffect(() => {
    if (queryUser) {
      dispatch(setUser(queryUser));
      localStorage.setItem("auth-user", JSON.stringify(queryUser));
    }
  }, [queryUser, dispatch]);

  useEffect(() => {
    if (isError || (isSuccess && !queryUser && hasToken)) {
      dispatch(clearUser());
      localStorage.removeItem("auth-token");
      localStorage.removeItem("auth-user");
      document.cookie = "auth-token=; path=/; max-age=0";
      const returnUrl = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/auth/login?returnUrl=${returnUrl}`);
    }
  }, [isError, isSuccess, queryUser, hasToken, router, pathname, dispatch]);

  // Initial token inspection or query still determining authentication
  if (hasToken === null || hasToken === false || isQueryLoading || (!queryUser && !reduxUser)) {
    return <GlobalAuthLoader />;
  }

  return <>{children}</>;
}
