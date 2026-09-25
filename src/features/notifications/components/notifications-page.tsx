"use client";

import { AlertTriangle, Bell, CheckCheck, Layers, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/pill-tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-admin-data";
import { useUrlParams } from "@/hooks/use-url-params";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";

type Filter = "all" | "unread" | "attention";

export default function NotificationsPage() {
  const toast = useToast();
  const { data, isLoading, isFetching, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { values, set } = useUrlParams({ filter: "all" });
  const filter: Filter = values.filter === "unread" || values.filter === "attention" ? values.filter : "all";

  const all = data ?? [];
  const unread = all.filter((n) => !n.read).length;
  const attention = all.filter((n) => n.type === "action_required").length;
  const shown = all.filter((n) => (filter === "unread" ? !n.read : filter === "attention" ? n.type === "action_required" : true));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Oversight alerts for new submissions, resubmissions, request updates and items that need attention."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await refetch();
                  toast.success("Notifications refreshed");
                } catch {
                  toast.error("Failed to refresh notifications");
                }
              }}
              disabled={isFetching}
              className="h-8 gap-1.5"
              aria-label="Refresh notifications"
              title="Refresh notifications"
            >
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  markAll.mutate();
                  toast.success("All notifications marked as read");
                }}
                disabled={markAll.isPending}
                className="bg-white dark:bg-card gap-1.5 shadow-2xs hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label={`Mark all ${unread} unread notifications as read`}
              >
                <CheckCheck className="size-4 text-primary" aria-hidden="true" />
                Mark All As Read ({unread})
              </Button>
            )}
          </div>
        }
      />

      <FilterPills
        label="Filter notifications"
        value={filter}
        onChange={(v) => set({ filter: v })}
        options={[
          { value: "all", label: "All", icon: Layers, count: all.length },
          { value: "unread", label: "Unread", icon: Bell, count: unread },
          { value: "attention", label: "Needs attention", icon: AlertTriangle, count: attention },
        ]}
      />

      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && shown.length === 0 && (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "All caught up" : "No notifications found"}
          description={
            filter === "unread"
              ? "You have reviewed all your notifications. New alerts will appear here."
              : "Oversight alerts about submissions and request updates will be listed here."
          }
        />
      )}

      {!isLoading && shown.length > 0 && (
        <div className="space-y-3" role="list" aria-label="Notification list">
          {shown.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={(id) => {
                markRead.mutate(id);
                toast.success("Notification marked as read");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
