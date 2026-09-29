export function ResidentStatusChip({
  status,
  active,
}: {
  status?: string;
  active?: boolean;
}) {
  const normalized = (status || "").toUpperCase();

  if (normalized === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  if (normalized === "PENDING_EMAIL_VERIFICATION") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Pending Verification
      </span>
    );
  }

  if (normalized === "INVITED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-sky-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
        <span className="size-1.5 rounded-full bg-sky-500" />
        Invited
      </span>
    );
  }

  if (normalized === "DISABLED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
        <span className="size-1.5 rounded-full bg-rose-500" />
        Inactive
      </span>
    );
  }

  if (normalized === "DELETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <span className="size-1.5 rounded-full bg-slate-400" />
        Deleted
      </span>
    );
  }

  // Fallback for custom or unrecognized string status
  if (normalized) {
    const formatted = normalized
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <span className="size-1.5 rounded-full bg-slate-400" />
        {formatted}
      </span>
    );
  }

  // Fallback to active boolean when status is omitted
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
      <span className="size-1.5 rounded-full bg-rose-500" />
      Inactive
    </span>
  );
}
