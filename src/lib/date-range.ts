/** Helpers for the submitted-date filters (the API takes `submittedFrom` / `submittedTo` as YYYY-MM-DD). */

/** Returns an error message when the range is invalid (start after end), otherwise null. */
export function validateDateRange(from?: string, to?: string): string | null {
  if (from && to && from > to) return "The start date must be on or before the end date.";
  return null;
}

/** A calendar year as a from / to range. */
export function yearToRange(year: string): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** The year when the range covers exactly one full calendar year, otherwise "". */
export function yearOfRange(from?: string, to?: string): string {
  const match = /^(\d{4})-01-01$/.exec(from ?? "");
  return match && to === `${match[1]}-12-31` ? match[1] : "";
}

/** The current year and the previous ones, newest first. */
export function yearOptions(count = 7): string[] {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(current - i));
}

/** The range to send to the API: an invalid range is never sent. */
export function usableRange(from?: string, to?: string): { from?: string; to?: string } {
  if (validateDateRange(from, to)) return {};
  return { from: from || undefined, to: to || undefined };
}
