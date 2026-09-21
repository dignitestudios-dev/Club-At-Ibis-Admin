"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type Pending = { type: "href"; href: string } | { type: "back" };

/**
 * Warns before unsaved work is lost:
 *  - refresh / tab close / typing a new URL (native browser prompt)
 *  - clicking any in-app link (sidebar, breadcrumbs, Cancel…)
 *  - the browser Back button (a history sentinel keeps the user on the page)
 * Call `allowLeave()` right before a deliberate navigation (e.g. after save).
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const dirtyRef = useRef(dirty);
  const bypass = useRef(false);
  const sentinelPushed = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // 1) Native prompt for refresh / close / external navigation.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bypass.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // 2) In-app link clicks (captured before Next's <Link> handles them).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || bypass.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ type: "href", href: url.pathname + url.search + url.hash });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 3) Browser Back button: park a sentinel entry, intercept the pop.
  useEffect(() => {
    if (dirty && !sentinelPushed.current) {
      sentinelPushed.current = true;
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
    }
  }, [dirty]);

  useEffect(() => {
    const onPop = () => {
      if (!dirtyRef.current || bypass.current) return;
      // Undo the pop so the user stays put, then ask.
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      setPending({ type: "back" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const allowLeave = useCallback(() => {
    bypass.current = true;
  }, []);

  function confirmLeave() {
    const target = pending;
    setPending(null);
    if (!target) return;
    bypass.current = true;
    if (target.type === "href") router.push(target.href);
    else window.history.go(-2); // sentinel + the page we came from
  }

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(o) => !o && setPending(null)}
      title="Leave without saving?"
      description="You have unsaved changes to this category. If you leave now, everything you entered will be lost."
      confirmLabel="Leave page"
      cancelLabel="Keep editing"
      destructive
      onConfirm={confirmLeave}
    />
  );

  return { dialog, allowLeave };
}
