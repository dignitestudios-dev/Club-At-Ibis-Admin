"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUserQuery } from "@/features/auth/api/auth.queries";
import { GlobalAuthLoader } from "@/components/shared/global-auth-loader";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearUser, setUser } from "@/store/slices/auth.slice";

function checkTokenValidity(): boolean {
  if (typeof window === "undefined") return false;
  const loggedOut = localStorage.getItem("caia.logged-out") === "true";
  let token = localStorage.getItem("auth-token");
  if (!token && typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)auth-token=([^;]+)/);
    if (match && match[1] && !loggedOut) {
      token = match[1];
      localStorage.setItem("auth-token", token);
    }
  }
  return !loggedOut && Boolean(token);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector((state) => state.auth.user);
  const [hasToken, setHasToken] = useState<boolean>(() => checkTokenValidity());

  const {
    data: queryUser,
    isLoading: isQueryLoading,
    isError,
    isSuccess,
  } = useCurrentUserQuery();

  // Verify auth on mount and whenever pathname changes
  useEffect(() => {
    const isValid = checkTokenValidity();
    setHasToken(isValid);
    if (!isValid) {
      dispatch(clearUser());
      const returnUrl = encodeURIComponent(pathname || "/dashboard");
      window.location.replace(`/auth/login?returnUrl=${returnUrl}`);
    }
  }, [pathname, dispatch]);

  // Handle bfcache (browser Back button restoration from cache)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      const isValid = checkTokenValidity();
      if (!isValid || e.persisted) {
        if (!isValid) {
          dispatch(clearUser());
          window.location.replace("/auth/login");
        }
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [dispatch]);

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
      window.location.replace(`/auth/login?returnUrl=${returnUrl}`);
    }
  }, [isError, isSuccess, queryUser, hasToken, pathname, dispatch]);

  // If no token, do not render a loading screen: redirect is already in-flight
  if (!hasToken) {
    return null;
  }

  // Initial query determining authenticated user
  if (isQueryLoading || (!queryUser && !reduxUser)) {
    return <GlobalAuthLoader />;
  }

  return <>{children}</>;
}

