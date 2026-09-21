"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store";
import { clearUser } from "@/store/slices/auth.slice";
import { authKeys } from "@/features/auth/api/auth.queries";

export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return function logout() {
    localStorage.setItem("caia.logged-out", "true");
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-user");
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
    dispatch(clearUser());
    queryClient.setQueryData(authKeys.currentUser, null);
    window.location.href = "/auth/login";
  };
}
