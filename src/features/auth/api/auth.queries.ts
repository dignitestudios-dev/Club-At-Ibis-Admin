import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "./auth.service";

export const authKeys = {
  all: ["auth"] as const,
  currentUser: ["auth", "currentUser"] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: getCurrentUser,
    staleTime: 60 * 1000,
  });
}
