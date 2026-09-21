import { seedAdmin, seedResidents, seedReviewers } from "./people";
import { seedCategories } from "./categories";
import { seedRequests } from "./requests";
import { seedActivity, seedNotifications, seedResets } from "./system";

// Bump whenever the seed data shape changes so stale localStorage from a
// previous schema gets replaced instead of causing runtime errors.
const SCHEMA_VERSION = "5";

const KEYS = {
  version: "caia.schema-version",
  admins: "caia.admins",
  reviewers: "caia.reviewers",
  residents: "caia.residents",
  categories: "caia.categories",
  requests: "caia.requests",
  notifications: "caia.notifications",
  activity: "caia.activity",
  resets: "caia.resets",
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function seedAll() {
  write(KEYS.admins, [seedAdmin]);
  write(KEYS.reviewers, seedReviewers);
  write(KEYS.residents, seedResidents);
  write(KEYS.categories, seedCategories);
  write(KEYS.requests, seedRequests);
  write(KEYS.notifications, seedNotifications);
  write(KEYS.activity, seedActivity);
  write(KEYS.resets, seedResets);
}

function ensureSeeded() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(KEYS.version) !== SCHEMA_VERSION) {
    seedAll();
    window.localStorage.setItem(KEYS.version, SCHEMA_VERSION);
  }
}

export function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const db = {
  getAdmins(): AdminUser[] {
    ensureSeeded();
    return read(KEYS.admins, [seedAdmin]);
  },
  setAdmins(admins: AdminUser[]) {
    write(KEYS.admins, admins);
  },
  getReviewers(): Reviewer[] {
    ensureSeeded();
    return read(KEYS.reviewers, seedReviewers);
  },
  setReviewers(reviewers: Reviewer[]) {
    write(KEYS.reviewers, reviewers);
  },
  getResidents(): Resident[] {
    ensureSeeded();
    return read(KEYS.residents, seedResidents);
  },
  setResidents(residents: Resident[]) {
    write(KEYS.residents, residents);
  },
  getCategories(): Category[] {
    ensureSeeded();
    return read(KEYS.categories, seedCategories);
  },
  setCategories(categories: Category[]) {
    write(KEYS.categories, categories);
  },
  getRequests(): RequestRecord[] {
    ensureSeeded();
    return read(KEYS.requests, seedRequests);
  },
  setRequests(requests: RequestRecord[]) {
    write(KEYS.requests, requests);
  },
  getNotifications(): AdminNotification[] {
    ensureSeeded();
    return read(KEYS.notifications, seedNotifications);
  },
  setNotifications(notifications: AdminNotification[]) {
    write(KEYS.notifications, notifications);
  },
  getActivity(): ActivityLogEntry[] {
    ensureSeeded();
    return read(KEYS.activity, seedActivity);
  },
  setActivity(activity: ActivityLogEntry[]) {
    write(KEYS.activity, activity);
  },
  getResets(): PasswordResetRecord[] {
    ensureSeeded();
    return read(KEYS.resets, seedResets);
  },
  setResets(resets: PasswordResetRecord[]) {
    write(KEYS.resets, resets);
  },
};
