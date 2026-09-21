import { memo } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

const ACCENT_CLASSES = {
  slate: {
    icon: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700",
    topBar: "from-slate-400 to-slate-600",
    glow: "group-hover:border-slate-300 dark:group-hover:border-slate-600",
  },
  navy: {
    icon: "bg-primary/10 text-primary dark:text-amber-300 border-primary/20",
    topBar: "from-primary to-slate-800 dark:from-amber-400 dark:to-amber-600",
    glow: "group-hover:border-primary/40",
  },
  blue: {
    icon: "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800",
    topBar: "from-sky-400 to-sky-600",
    glow: "group-hover:border-sky-300 dark:group-hover:border-sky-700",
  },
  amber: {
    icon: "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-amber-800",
    topBar: "from-amber-400 to-amber-600",
    glow: "group-hover:border-amber-300 dark:group-hover:border-amber-700",
  },
  emerald: {
    icon: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800",
    topBar: "from-emerald-400 to-emerald-600",
    glow: "group-hover:border-emerald-300 dark:group-hover:border-emerald-700",
  },
  purple: {
    icon: "bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-200/80 dark:border-purple-800",
    topBar: "from-purple-400 to-purple-600",
    glow: "group-hover:border-purple-300 dark:group-hover:border-purple-700",
  },
  gold: {
    icon: "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-amber-800",
    topBar: "from-brand-gold to-amber-600",
    glow: "group-hover:border-brand-gold/50",
  },
  red: {
    icon: "bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-200/80 dark:border-rose-800",
    topBar: "from-rose-400 to-rose-600",
    glow: "group-hover:border-rose-300 dark:group-hover:border-rose-700",
  },
} as const;

export type StatAccent = keyof typeof ACCENT_CLASSES;

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  accent = "slate",
  trend,
  hint,
  href,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: StatAccent;
  trend?: { value: string; direction: "up" | "down"; positive?: boolean };
  hint?: string;
  /** Makes the whole card a link (e.g. into a pre-filtered request list). */
  href?: string;
  className?: string;
}) {
  const accentStyle = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.slate;

  const body = (
    <>
      <span
        className={cn(
          "absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r transition-opacity duration-300 opacity-80 group-hover:opacity-100",
          accentStyle.topBar
        )}
      />

      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110",
            accentStyle.icon
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-heading text-3xl font-semibold text-foreground tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              trend.positive === false
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800"
                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800"
            )}
          >
            {trend.direction === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {trend.value}
          </span>
        )}
      </div>
    </>
  );

  const classes = cn(
    "group relative flex flex-col justify-between gap-3.5 overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-all duration-300",
    "hover:-translate-y-1 hover:shadow-md",
    accentStyle.glow,
    href && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`${label}: ${value}`}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
});
