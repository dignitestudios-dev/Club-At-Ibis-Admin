/**
 * Dynamic date helpers so mock timestamps always look fresh
 * ("2 hours ago", "3 days ago") no matter when the prototype is opened.
 */

export function currentYear(): number {
  return new Date().getFullYear();
}

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export function hoursAgo(hours: number, minutes = 0): string {
  return new Date(Date.now() - (hours * 60 + minutes) * 60 * 1000).toISOString();
}

export function daysAgo(days: number, hours = 0, minutes = 0): string {
  return new Date(Date.now() - ((days * 24 + hours) * 60 + minutes) * 60 * 1000).toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}
