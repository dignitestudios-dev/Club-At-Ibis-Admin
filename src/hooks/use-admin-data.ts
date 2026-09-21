"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReviewers, createReviewer, updateReviewer, setReceiveNewRequests, setLoginEnabled } from "@/features/reviewers/api/reviewers.service";
import { getResidents, setResidentActive } from "@/features/residents/api/residents.service";
import { getCategories, createCategory, updateCategory, archiveCategory, restoreCategory } from "@/features/categories/api/categories.service";
import { getRequests, recordExport } from "@/features/requests/api/requests.service";
import { getActivity } from "@/features/activity/api/activity.service";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/api/notifications.service";
import { getResets, sendPasswordReset, type SendResetPayload } from "@/features/password-reset/api/password-reset.service";

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

export const useReviewers = () => useQuery({ queryKey: keys.reviewers, queryFn: getReviewers });
export const useResidents = () => useQuery({ queryKey: keys.residents, queryFn: getResidents });
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
