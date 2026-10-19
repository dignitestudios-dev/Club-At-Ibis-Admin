"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  loading = false,
  icon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
  icon?: ReactNode;
}) {
  const renderedMedia = icon !== undefined ? (
    icon ? <AlertDialogMedia>{icon}</AlertDialogMedia> : null
  ) : destructive ? (
    <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20">
      <AlertTriangle className="size-5" />
    </AlertDialogMedia>
  ) : (
    <AlertDialogMedia className="bg-primary/10 text-primary dark:bg-primary/20">
      <Info className="size-5" />
    </AlertDialogMedia>
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-center text-center">
          {renderedMedia}
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading && <Spinner className="size-4" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
