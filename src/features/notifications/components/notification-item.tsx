"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationIcon, NOTIFICATION_LABEL } from "@/features/notifications/components/notification-icon";
import { formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

const BADGE: Record<AdminNotificationType, string> = {
  new_submission: "bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60",
  resubmission: "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60",
  request_update: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
  withdrawal: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  action_required: "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
};

/** Same card as the resident portal's notification item. */
export const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: AdminNotification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <article
      aria-label={`${notification.title} - ${notification.read ? "Read" : "Unread"}`}
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-white dark:bg-card p-4.5 sm:p-5 shadow-2xs transition-all duration-200",
        "hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md",
        !notification.read ? "border-l-4 border-l-primary border-slate-200 dark:border-slate-700 shadow-xs" : "border-border/80"
      )}
    >
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <NotificationIcon type={notification.type} className="mt-0.5 size-10" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", BADGE[notification.type])}>
              {NOTIFICATION_LABEL[notification.type]}
            </span>
            {!notification.read && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide dark:text-amber-300">NEW</span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)}>
                {formatRelative(notification.createdAt)}
              </time>
            </span>
          </div>
          <h3
            className={cn(
              "font-heading text-base font-medium text-foreground group-hover:text-primary transition-colors",
              !notification.read && "font-semibold text-primary"
            )}
          >
            {notification.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{notification.message}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
        {!notification.read && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onMarkRead(notification.id)}
            className="gap-1.5 text-xs text-muted-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-foreground"
            aria-label={`Mark "${notification.title}" as read`}
          >
            <Check className="size-3.5" aria-hidden="true" />
            Mark read
          </Button>
        )}
        {notification.requestId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-primary/50 text-xs font-medium shadow-2xs"
            nativeButton={false}
            render={
              <Link
                href={`/requests/${notification.requestId}`}
                onClick={() => {
                  if (!notification.read) onMarkRead(notification.id);
                }}
                aria-label={`View request details for ${notification.title}`}
              />
            }
          >
            View Request
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  );
});
