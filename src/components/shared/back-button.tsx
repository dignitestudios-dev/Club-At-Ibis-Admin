"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

/**
 * Icon-only back button for detail pages. Uses browser history so the list the
 * user came from keeps its URL-driven filters, search and page. `fallbackHref`
 * is only used when there is no history to go back to (deep link, new tab).
 */
export function BackButton({ fallbackHref, className }: { fallbackHref: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      aria-label="Go back"
      title="Back"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
    </button>
  );
}
