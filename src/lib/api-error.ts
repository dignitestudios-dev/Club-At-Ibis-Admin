import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/** One entry from the backend's `{ success: false, details: [...] }` validation envelope. */
export interface ApiErrorDetail {
  /** e.g. "body.employeeNumber" — the request-schema path Zod failed on. */
  path: string;
  message: string;
}

/**
 * Thrown by the axios response interceptor instead of a plain Error so
 * per-field validation details survive the round trip to the calling form
 * (a plain `Error` from the old interceptor discarded them, leaving only a
 * generic top-level message).
 */
export class ApiError extends Error {
  code?: string;
  details?: ApiErrorDetail[];

  constructor(message: string, code?: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

/** Strips the request-schema segment ("body."/"query."/"params.") off a detail path. */
export function fieldNameFromPath(path: string): string {
  const parts = path.split(".");
  return parts.length > 1 ? parts.slice(1).join(".") : path;
}

/**
 * Maps backend validation `details` onto react-hook-form fields via
 * `setError`, so "Employee number: Too small: expected string to have >=1
 * characters" shows up under the Employee Number input instead of only in a
 * toast. Returns true if at least one detail matched a known field — callers
 * use that to decide whether a fallback toast is still needed for anything
 * that didn't map to a field (e.g. a business-rule error with no `details`).
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
  /** Backend field name -> form field name, for the rare cases they differ (e.g. `isDefaultReviewer` -> `receiveNewRequests`). */
  fieldMap: Record<string, string> = {}
): boolean {
  if (!(error instanceof ApiError) || !error.details?.length) return false;
  let applied = false;
  for (const detail of error.details) {
    const backendField = fieldNameFromPath(detail.path);
    const field = fieldMap[backendField] ?? backendField;
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: "server", message: detail.message });
      applied = true;
    }
  }
  return applied;
}
