"use client";

import { useToastContext } from "@/providers/toast-provider";

export function useToast() {
  const { show } = useToastContext();

  return {
    success: (title: string, description?: string) => show("success", title, description),
    error: (title: string, description?: string) => show("error", title, description),
    info: (title: string, description?: string) => show("info", title, description),
    warning: (title: string, description?: string) => show("warning", title, description),
  };
}
