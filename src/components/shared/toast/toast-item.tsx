import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/utils/cn";

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string; chipClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    chipClass: "bg-emerald-50 dark:bg-emerald-950/60",
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-600 dark:text-red-400",
    chipClass: "bg-red-50 dark:bg-red-950/60",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-600 dark:text-blue-400",
    chipClass: "bg-blue-50 dark:bg-blue-950/60",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    chipClass: "bg-amber-50 dark:bg-amber-950/60",
  },
};

export function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, iconClass, chipClass } = VARIANT_CONFIG[toast.variant];

  return (
    <div
      role="status"
      className={cn(
        "animate-in slide-in-from-bottom-2 fade-in zoom-in-95 pointer-events-auto flex w-80 gap-3 rounded-lg border border-border bg-card p-3.5 shadow-lg duration-200",
        toast.description ? "items-start" : "items-center"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          chipClass
        )}
      >
        <Icon className={cn("size-4.5", iconClass)} />
      </span>
      <div className={cn("min-w-0 flex-1", toast.description ? "pt-0.5" : "flex flex-col justify-center")}>
        <p className="text-sm font-medium text-foreground leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className={cn(
          "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors",
          toast.description && "mt-0.5"
        )}
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
