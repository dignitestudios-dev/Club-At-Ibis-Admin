"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NotificationIcon } from "@/features/notifications/components/notification-icon";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-admin-data";
import { formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read).length;
  const recent = notifications.slice(0, 6);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={unread > 0 ? `Oversight alerts (${unread} unread)` : "Oversight alerts"}
          />
        }
      >
        <Bell className="size-4.5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-semibold text-white shadow-xs">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-92 gap-0 overflow-hidden p-0 shadow-xl border-border/80 sm:w-[26rem]">
        <div className="flex items-center justify-between border-b border-border/80 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="font-heading text-base font-semibold text-foreground">Oversight alerts</p>
            {unread > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary dark:text-amber-300">
                {unread} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Mark all read
              </button>
            )}
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-[11px] font-medium text-primary hover:underline dark:text-amber-300">
              View all
            </Link>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted-foreground">
            <BellOff className="size-6" />
            <p className="text-sm">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <ul className="divide-y divide-border/70">
              {recent.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                      setOpen(false);
                      if (n.requestId) router.push(`/requests/${n.requestId}`);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      !n.read && "bg-primary/[0.04] dark:bg-primary/10"
                    )}
                  >
                    <NotificationIcon type={n.type} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{n.title}</span>
                        {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-brand-gold" aria-label="Unread" />}
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground/80">{formatRelative(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
