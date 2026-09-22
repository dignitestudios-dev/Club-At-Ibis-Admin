"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReviewers, getReviewersPage, getReviewer, createReviewer, updateReviewer, setReceiveNewRequests, setLoginEnabled, resendInvitation } from "@/features/reviewers/api/reviewers.service";
import { getMockReviewers } from "@/features/reviewers/api/reviewers.mock";
import { getResidents, getResidentsPage, getResident, setResidentActive } from "@/features/residents/api/residents.service";
import { getMockResidents } from "@/features/residents/api/residents.mock";
import { getCategories, createCategory, updateCategory, archiveCategory, restoreCategory, restoreCategoryVersion } from "@/features/categories/api/categories.service";
import { getRequests, recordExport } from "@/features/requests/api/requests.service";
import { assignRequest, type AssignPayload } from "@/features/requests/api/assignments.service";
import { getActivity } from "@/features/activity/api/activity.service";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/api/notifications.service";
import { getResets, sendPasswordReset, setUserPassword, type SendResetPayload, type SetPasswordPayload } from "@/features/password-reset/api/password-reset.service";

export const keys = {
  reviewers: ["reviewers"] as const,
  residents: ["residents"] as const,
  categories: ["categories"] as const,
  requests: ["requests"] as const,
  activity: ["activity"] as const,
  notifications: ["notifications"] as const,
  resets: ["resets"] as const,
};

/* ------------------------------ queries ------------------------------ */

/** `limit` lets a caller request a bigger/smaller batch than the default (100). */
export const useReviewers = (limit?: number) =>
  useQuery({ queryKey: [...keys.reviewers, limit ?? "default"], queryFn: () => getReviewers(limit) });
export const useResidents = (limit?: number) =>
  useQuery({ queryKey: [...keys.residents, limit ?? "default"], queryFn: () => getResidents(limit) });

/** Real server-side pagination for the Reviewer Accounts / Resident Records tables. */
export const useReviewersPage = (params: { page: number; limit: number; search: string }) =>
  useQuery({ queryKey: [...keys.reviewers, "page", params], queryFn: () => getReviewersPage(params) });
export const useResidentsPage = (params: { page: number; limit: number; search: string }) =>
  useQuery({ queryKey: [...keys.residents, "page", params], queryFn: () => getResidentsPage(params) });

/** Single-account fetches for the detail pages — hits the real "get by id" endpoint, not a fetch-all. */
export const useReviewer = (id: string) => useQuery({ queryKey: [...keys.reviewers, id], queryFn: () => getReviewer(id), enabled: !!id });
export const useResident = (id: string) => useQuery({ queryKey: [...keys.residents, id], queryFn: () => getResident(id), enabled: !!id });

/**
 * Mock-backed reviewer/resident data for features still working against mock
 * Requests (assignment, dashboard, global search) — see reviewers.mock.ts /
 * residents.mock.ts for why these stay separate from the real API above.
 */
export const useMockReviewers = () => useQuery({ queryKey: ["reviewers", "mock"], queryFn: getMockReviewers });
export const useMockResidents = () => useQuery({ queryKey: ["residents", "mock"], queryFn: getMockResidents });
export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: getCategories });
export const useRequests = () => useQuery({ queryKey: keys.requests, queryFn: getRequests });
export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: getActivity });
export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: getNotifications });
export const useResets = () => useQuery({ queryKey: keys.resets, queryFn: getResets });

/* ----------------------------- mutations ----------------------------- */

function useInvalidate() {
  const qc = useQueryClient();
  return (...list: (readonly string[])[]) =>
    Promise.all(list.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useCreateReviewer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: createReviewer,
    onSuccess: () => invalidate(keys.reviewers, keys.activity),
  });
}

export function useUpdateReviewer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateReviewer>[1] }) =>
      updateReviewer(id, updates),
    onSuccess: () => invalidate(keys.reviewers, keys.activity),
  });
}

export function useSetReceiveNewRequests() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: setReceiveNewRequests,
    onSuccess: () => invalidate(keys.reviewers, keys.activity, keys.notifications),
  });
}

export function useSetLoginEnabled() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, enabled, replacementId }: { id: string; enabled: boolean; replacementId?: string }) =>
      setLoginEnabled(id, enabled, replacementId),
    onSuccess: () => invalidate(keys.reviewers, keys.activity),
  });
}

export function useCreateCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => invalidate(keys.categories, keys.activity),
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryDraftPayload }) => updateCategory(id, payload),
    onSuccess: () => invalidate(keys.categories, keys.activity),
  });
}

export function useArchiveCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: archiveCategory,
    onSuccess: () => invalidate(keys.categories, keys.activity),
  });
}

export function useRestoreCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: restoreCategory,
    onSuccess: () => invalidate(keys.categories, keys.activity),
  });
}

export function useSendPasswordReset() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: SendResetPayload) => sendPasswordReset(payload),
    onSuccess: () => invalidate(keys.resets, keys.activity),
  });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => invalidate(keys.notifications),
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => invalidate(keys.notifications),
  });
}

export function useRecordExport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ count, summary }: { count: number; summary: string }) => recordExport(count, summary),
    onSuccess: () => invalidate(keys.activity),
  });
}

export function useSetResidentActive() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setResidentActive(id, active),
    onSuccess: () => invalidate(keys.residents, keys.activity),
  });
}

export function useAssignRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: AssignPayload) => assignRequest(payload),
    onSuccess: () => invalidate(keys.requests, keys.activity, keys.notifications),
  });
}

export function useResendInvitation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: resendInvitation,
    onSuccess: () => invalidate(keys.activity),
  });
}

export function useSetUserPassword() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: SetPasswordPayload) => setUserPassword(payload),
    onSuccess: () => invalidate(keys.activity, keys.reviewers),
  });
}

export function useRestoreCategoryVersion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => restoreCategoryVersion(id, version),
    onSuccess: () => invalidate(keys.categories, keys.activity),
  });
}
