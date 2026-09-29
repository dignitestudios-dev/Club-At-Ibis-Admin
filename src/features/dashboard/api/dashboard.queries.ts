import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "./dashboard.service";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: getAdminDashboard,
    staleTime: 30_000,
  });
}
