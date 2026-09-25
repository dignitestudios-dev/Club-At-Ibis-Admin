"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ToastViewport } from "@/components/shared/toast/toast-viewport";

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function show(variant: ToastVariant, title: string, description?: string) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, variant, title, description }]);
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (sessionStorage.getItem("caia.session-expired") === "true") {
      sessionStorage.removeItem("caia.session-expired");
      show("error", "Session expired", "Please sign in again to continue.");
    }

    const handleSessionExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string; title?: string }>;
      const title = customEvent.detail?.title || "Session expired";
      const description = customEvent.detail?.message || "Please sign in again to continue.";
      setToasts((prev) => {
        if (prev.some((t) => t.title === title)) return prev;
        const id = crypto.randomUUID();
        setTimeout(() => dismiss(id), TOAST_DURATION_MS);
        return [...prev, { id, variant: "error", title, description }];
      });
    };

    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ variant?: ToastVariant; title: string; description?: string }>;
      if (customEvent.detail?.title) {
        show(
          customEvent.detail.variant || "info",
          customEvent.detail.title,
          customEvent.detail.description
        );
      }
    };

    window.addEventListener("app:session-expired", handleSessionExpired);
    window.addEventListener("app:toast", handleCustomToast);

    return () => {
      window.removeEventListener("app:session-expired", handleSessionExpired);
      window.removeEventListener("app:toast", handleCustomToast);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used inside <ToastProvider>");
  return ctx;
}
