"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/cases", label: "Vorgänge", Icon: FolderKanban },
  { href: "/documents", label: "Dokumente", Icon: FileText },
  { href: "/tasks", label: "Aufgaben", Icon: ListTodo },
  { href: "/deadlines", label: "Fristen", Icon: CalendarClock },
  { href: "/settings", label: "Einstellungen", Icon: Settings },
] as const;

function useIsActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  Icon,
  variant,
}: {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  variant: "sidebar" | "bottom";
}) {
  const active = useIsActive(href);

  if (variant === "bottom") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/8 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Link>
  );
}

export function SidebarNav() {
  return (
    <nav className="space-y-1" aria-label="Hauptnavigation">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} variant="sidebar" />
      ))}
    </nav>
  );
}

/** Mobile-first: Auf kleinen Displays liegt die Navigation unten. */
export function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 backdrop-blur md:hidden print:hidden"
    >
      {NAV_ITEMS.filter((item) => item.href !== "/settings").map((item) => (
        <NavLink key={item.href} {...item} variant="bottom" />
      ))}
    </nav>
  );
}
