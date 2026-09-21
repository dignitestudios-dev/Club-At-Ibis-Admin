import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppTopbar } from "@/components/shared/app-topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <aside className="hidden w-64 shrink-0 border-r border-border lg:block" aria-label="Sidebar">
        <div className="fixed h-svh w-64">
          <AppSidebar />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 lg:px-8 lg:py-8 outline-none">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
