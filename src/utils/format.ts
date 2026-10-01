import { format, formatDistanceToNow } from "date-fns";

/** `undefined`/empty/unparseable input is a real, recurring shape from the API (e.g. a refund record with no date yet) — never throw out of a render for it. */
function parseDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso: string | undefined | null): string {
  const d = parseDate(iso);
  return d ? format(d, "MMM d, yyyy") : "—";
}

export function formatDateTime(iso: string | undefined | null): string {
  const d = parseDate(iso);
  return d ? format(d, "MMM d, yyyy 'at' h:mm a") : "—";
}

export function formatTime(iso: string | undefined | null): string {
  const d = parseDate(iso);
  return d ? format(d, "h:mm a") : "—";
}

export function formatRelative(iso: string | undefined | null): string {
  const d = parseDate(iso);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "—";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
