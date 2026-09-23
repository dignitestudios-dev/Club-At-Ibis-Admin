import { AppShell } from "@/components/shared/app-shell";
import { AuthGate } from "@/components/shared/auth-gate";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
