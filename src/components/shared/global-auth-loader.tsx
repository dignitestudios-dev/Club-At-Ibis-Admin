import { Logo } from "@/components/shared/logo";
import { Loader } from "@/components/ui/spinner";

export interface GlobalAuthLoaderProps {
  message?: string;
  subtitle?: string;
}

export function GlobalAuthLoader({
  message = "Authenticating Super Admin Console...",
  subtitle = "The Club at Ibis Architectural Review Board · Administration",
}: GlobalAuthLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-svh w-full flex flex-col items-center justify-center p-6 bg-background text-foreground select-none"
    >
      <div className="flex flex-col items-center justify-center text-center max-w-sm">
        <div className="mb-6">
          <Logo variant="navy" size={42} layout="vertical" />
        </div>

        <div className="my-3 flex items-center justify-center">
          <Loader className="size-8 text-primary dark:text-brand-gold" />
        </div>

        <p className="mt-3 text-sm font-medium text-foreground/90">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
