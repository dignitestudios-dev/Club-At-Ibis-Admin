"use client";

import { Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function PageFallback() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-14 w-64 rounded-lg" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Wraps pages that read the URL (useSearchParams) and cached client data.
 * Rendering only after mount keeps the first client render identical to the
 * server markup, so there are no hydration mismatches.
 */
export function PageSuspense({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <Suspense fallback={<PageFallback />}>{mounted ? children : <PageFallback />}</Suspense>;
}
