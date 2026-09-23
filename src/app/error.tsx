"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center animate-in fade-in">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
        <AlertCircle className="size-7" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred while loading this section. Please try again or return to the dashboard.
        </p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={() => reset()} className="gap-2">
          <RotateCw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
