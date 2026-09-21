"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CornerDownLeft,
  FileText,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  ScrollText,
  Search,
  UserCog,
  UserRound,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCategories, useRequests, useResidents, useReviewers } from "@/hooks/use-admin-data";
import { residentFullName } from "@/lib/domain";
import { cn } from "@/utils/cn";

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
}

const PAGES: PaletteItem[] = [
  { id: "p-dashboard", group: "Go to", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "p-requests", group: "Go to", label: "All Requests", href: "/requests", icon: ListChecks },
  { id: "p-assign", group: "Go to", label: "Assignments", href: "/assignments", icon: UserRoundCheck },
  { id: "p-reviewers", group: "Go to", label: "Reviewers", href: "/reviewers", icon: UserCog },
  { id: "p-residents", group: "Go to", label: "Residents", href: "/residents", icon: Users },
  { id: "p-reset", group: "Go to", label: "Password Reset", href: "/password-reset", icon: KeyRound },
  { id: "p-categories", group: "Go to", label: "Categories & Forms", href: "/categories", icon: LayoutTemplate },
  { id: "p-new-category", group: "Go to", label: "Add new category", href: "/categories/new", icon: LayoutTemplate },
  { id: "p-activity", group: "Go to", label: "Activity Log", href: "/activity", icon: ScrollText },
  { id: "p-notifications", group: "Go to", label: "Notifications", href: "/notifications", icon: Bell },
  { id: "p-profile", group: "Go to", label: "My Profile", href: "/profile", icon: UserRound },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: requests } = useRequests();
  const { data: residents } = useResidents();
  const { data: reviewers } = useReviewers();
  const { data: categories } = useCategories();

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES;
    const residentById = new Map((residents ?? []).map((r) => [r.id, r]));

    const found: PaletteItem[] = [];
    (requests ?? []).forEach((r) => {
      const res = residentById.get(r.residentId);
      const hay = `${r.code} ${residentFullName(res)} ${res?.residentIdNumber ?? ""} ${r.fieldValues.propertyAddress} ${r.fieldValues.lotNo} ${r.categoryName}`.toLowerCase();
      if (hay.includes(q)) {
        found.push({
          id: `r-${r.id}`,
          group: "Requests",
          label: `${r.code} · ${r.categoryName}`,
          hint: `${residentFullName(res)} — ${r.fieldValues.propertyAddress}`,
          href: `/requests/${r.id}`,
          icon: FileText,
        });
      }
    });
    (residents ?? []).forEach((r) => {
      if (`${residentFullName(r)} ${r.residentIdNumber} ${r.email} ${r.address} ${r.lotNo}`.toLowerCase().includes(q)) {
        found.push({ id: `res-${r.id}`, group: "Residents", label: residentFullName(r), hint: `${r.residentIdNumber} · ${r.email}`, href: `/residents/${r.id}`, icon: Users });
      }
    });
    (reviewers ?? []).forEach((r) => {
      if (`${r.name} ${r.employeeNumber} ${r.email} ${r.designation}`.toLowerCase().includes(q)) {
        found.push({ id: `rev-${r.id}`, group: "Reviewers", label: r.name, hint: `${r.employeeNumber} · ${r.designation}`, href: `/reviewers/${r.id}`, icon: UserCog });
      }
    });
    (categories ?? []).forEach((c) => {
      if (`${c.name} ${c.description}`.toLowerCase().includes(q)) {
        found.push({ id: `cat-${c.id}`, group: "Categories", label: c.name, hint: c.status === "archived" ? "Archived" : "Active", href: `/categories/${c.id}/edit`, icon: LayoutTemplate });
      }
    });
    PAGES.forEach((p) => {
      if (p.label.toLowerCase().includes(q)) found.push(p);
    });
    return found.slice(0, 40);
  }, [query, requests, residents, reviewers, categories]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(item?: PaletteItem) {
    if (!item) return;
    onOpenChange(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    }
  }

  let lastGroup = "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search the console</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to requests, residents, reviewers, categories and pages.
        </DialogDescription>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search requests, residents, reviewers, categories…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search the console"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2 custom-scrollbar" role="listbox">
          {items.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;.
            </p>
          )}
          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {showGroup && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {item.group}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === active ? "bg-primary/10 text-foreground dark:bg-primary/20" : "text-foreground/85"
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                    <Icon className="size-4 text-primary dark:text-amber-300" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>}
                  </span>
                  {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ to navigate · ↵ to open</span>
          <span>{items.length} result{items.length === 1 ? "" : "s"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
