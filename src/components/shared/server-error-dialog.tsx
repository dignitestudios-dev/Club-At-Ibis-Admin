"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ServerErrorDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleServerError = () => setOpen(true);
    window.addEventListener("app:server-error", handleServerError);
    return () => window.removeEventListener("app:server-error", handleServerError);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <DialogTitle className="font-heading text-xl font-medium text-center">Something went wrong on our end</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            We&apos;re having trouble connecting right now. Please try again in a moment.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2.5 sm:gap-3 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
