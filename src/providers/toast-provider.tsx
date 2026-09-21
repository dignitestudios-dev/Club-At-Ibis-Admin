"use client";

import { createContext, useContext, useState } from "react";
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
