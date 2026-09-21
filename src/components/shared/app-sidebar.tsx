"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { navGroups, type NavItem } from "@/components/shared/nav-items";
import { useNotifications, useRequests } from "@/hooks/use-admin-data";
import { attentionBuckets } from "@/lib/domain";
import { cn } from "@/utils/cn";

function findActiveHref(pathname: string, items: NavItem[]): string | null {
  const exact = items.find((item) => pathname === item.href);
  if (exact) return exact.href;
  const matches = items.filter((item) => pathname.startsWith(`${item.href}/`));
  if (matches.length === 0) return null;
  return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best)).href;
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const allItems = navGroups.flatMap((g) => g.items);
  const activeHref = findActiveHref(pathname, allItems);

  const { data: requests } = useRequests();
  const { data: notifications } = useNotifications();
  const buckets = requests ? attentionBuckets(requests) : null;
  const counts = {
    attention: buckets ? buckets.unassigned.length + buckets.resubmitted.length + buckets.refundsAwaiting.length : 0,
    intake: buckets ? buckets.unassigned.length : 0,
    notifications: notifications?.filter((n) => !n.read).length ?? 0,
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col items-center justify-center border-b border-sidebar-border px-4 py-5 text-center">
        <Logo
          variant="ivory"
          href="/dashboard"
          size={50}
          layout="vertical"
          titleClassName="text-[26px] sm:text-3xl font-medium tracking-tight text-white"
        />
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest text-amber-200 uppercase">
          <ShieldCheck className="size-3" aria-hidden="true" />
          Super Admin
        </span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-4 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400/70 uppercase">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === activeHref;
                const Icon = item.icon;
                const count = item.badge ? counts[item.badge] : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-sidebar-accent text-white font-medium shadow-2xs"
                        : "text-slate-300/85 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {isActive && (
                      <span className="absolute top-1/2 left-0 h-4 w-1 -translate-y-1/2 rounded-r bg-brand-gold" aria-hidden="true" />
                    )}
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive ? "text-brand-gold" : "text-slate-400 group-hover:text-slate-200"
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "min-w-5 rounded-full px-1.5 py-px text-center text-[10px] font-bold tabular-nums",
                          item.badge === "notifications" ? "bg-rose-500 text-white" : "bg-brand-gold text-[#0d1522]"
                        )}
                        aria-label={`${count} pending`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3 text-center">
        <p className="text-[10px] text-slate-400">Architectural Review Board · Admin Console</p>
      </div>
    </div>
  );
}
