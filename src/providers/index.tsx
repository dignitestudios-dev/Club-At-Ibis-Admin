import { ThemeProvider } from "next-themes";
import ReduxProvider from "./redux-provider";
import QueryProvider from "./query-provider";
import AuthRehydrator from "./auth-rehydrator";
import ToastProvider from "./toast-provider";
import AppProgressProvider from "./progress-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServerErrorDialog } from "@/components/shared/server-error-dialog";
import { OfflineBanner } from "@/components/shared/offline-banner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProgressProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ReduxProvider>
          <QueryProvider>
            <AuthRehydrator>
              <TooltipProvider>
                <ToastProvider>
                  {children}
                  <ServerErrorDialog />
                  <OfflineBanner />
                </ToastProvider>
              </TooltipProvider>
            </AuthRehydrator>
          </QueryProvider>
        </ReduxProvider>
      </ThemeProvider>
    </AppProgressProvider>
  );
}
