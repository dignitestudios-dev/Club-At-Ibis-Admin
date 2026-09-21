import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Logo variant="navy" showWordmark={false} size={36} />
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
      </div>
      <Button render={<Link href="/dashboard" />} nativeButton={false}>
        Back to Dashboard
      </Button>
    </div>
  );
}
