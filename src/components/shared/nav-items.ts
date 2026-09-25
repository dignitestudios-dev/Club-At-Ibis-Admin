import {
  LayoutDashboard,
  ListChecks,
  UserRoundCheck,
  UserCog,
  Users,
  LayoutTemplate,
  ScrollText,
  Bell,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Key of a live counter to show as a badge. */
  badge?: "attention" | "notifications" | "intake";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Oversight",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/requests", label: "All Requests", icon: ListChecks },
      { href: "/assignments", label: "Assignments", icon: UserRoundCheck, badge: "intake" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/reviewers", label: "Reviewers", icon: UserCog },
      { href: "/residents", label: "Residents", icon: Users },
    ],
  },
  {
    label: "Configuration",
    items: [{ href: "/categories", label: "Categories & Forms", icon: LayoutTemplate }],
  },
  {
    label: "System",
    items: [
      { href: "/activity", label: "Activity Log", icon: ScrollText },
      { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
      { href: "/profile", label: "My Profile", icon: UserRound },
    ],
  },
];
