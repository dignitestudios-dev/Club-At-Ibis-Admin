"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Shown when a list or dashboard fails to load, so a failure never looks like an empty or zero result. */
export function ErrorState({
  title = "We couldn't load this",
  description = "Something went wrong while loading. Check your connection and try again.",
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      className={className}
      action={
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          {retrying ? <Spinner className="size-4" /> : <RotateCw className="size-4" />}
          Try again
        </Button>
      }
    />
  );
}
