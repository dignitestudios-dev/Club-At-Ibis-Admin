import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";

export interface MasterPasswordStatus {
  configured: boolean;
  enabled: boolean;
  updatedAt: string | null;
}

export interface EasyAccessResult {
  token: string;
  expiresIn: string;
}

const statusKey = ["master-password"] as const;

/** GET /admin/master-password: never returns the password or its hash. */
async function getMasterPasswordStatus(): Promise<MasterPasswordStatus> {
  const { data } = await axiosInstance.get("/admin/master-password");
  const status = data?.data?.masterPassword ?? {};
  return {
    configured: !!status.configured,
    enabled: !!status.enabled,
    updatedAt: status.updatedAt ?? null,
  };
}

/** PUT /admin/master-password: creates, changes or re-enables it. Needs the admin's own current password. */
async function setMasterPassword(payload: { currentPassword: string; masterPassword: string }) {
  await axiosInstance.put("/admin/master-password", payload);
}

/** DELETE /admin/master-password: disables it (admin easy access keeps working). */
async function disableMasterPassword(payload: { currentPassword: string }) {
  await axiosInstance.delete("/admin/master-password", { data: payload });
}

/** POST /auth/easy-access: a 15-minute resident token for this resident, issued to the signed-in Super Admin. */
export async function requestEasyAccess(email: string): Promise<EasyAccessResult> {
  const { data } = await axiosInstance.post("/auth/easy-access", { email });
  return { token: data.data.token, expiresIn: data.data.expiresIn };
}

export const useMasterPasswordStatus = () =>
  useQuery({ queryKey: statusKey, queryFn: getMasterPasswordStatus });

export function useSetMasterPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setMasterPassword,
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey }),
  });
}

export function useDisableMasterPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: disableMasterPassword,
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey }),
  });
}

/** The Resident portal's address (no trailing slash). Set NEXT_PUBLIC_RESIDENT_URL per environment. */
export function residentPortalUrl() {
  return (process.env.NEXT_PUBLIC_RESIDENT_URL ?? "https://clubatibis-resident.vercel.app").replace(/\/+$/, "");
}

/**
 * Opens the Resident portal signed in as this resident. The tab is opened first, inside the click, so the
 * browser doesn't treat it as a pop-up; it is pointed at the hand-off page once the API has issued the token.
 */
export async function openResidentAccess(email: string) {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const { token } = await requestEasyAccess(email);
    const url = `${residentPortalUrl()}/admin-access?token=${encodeURIComponent(token)}`;
    if (tab) tab.location.href = url;
    else window.open(url, "_blank");
  } catch (error) {
    tab?.close();
    throw error;
  }
}
