"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, HandMetal, GraduationCap, History,
  User, LogOut, PanelLeft, PanelLeftClose, Flame, Zap, Trophy, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoCompact, LogoIcon } from "@/components/Logo";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { toggleSidebar } from "@/lib/store/slices/uiSlice";
import { logout } from "@/lib/store/slices/authSlice";
import { useProgressStats } from "@/lib/hooks/useProgress";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/sign", label: "Sign Studio", icon: HandMetal },
  { href: "/express", label: "Express", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((s) => s.ui);
  const { user, token } = useAppSelector((s) => s.auth);
  const { streak, xp, level } = useProgressStats();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  const expanded = sidebarOpen;

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Sidebar — expands with labels, collapses to icons only */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--border)] bg-[var(--nav-bg)] transition-[width] duration-200 ease-out",
          expanded ? "w-64" : "w-[4.5rem]"
        )}
        aria-label="Main navigation"
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-[var(--border)] gap-1",
            expanded ? "justify-between px-3" : "flex-col justify-center gap-1 px-1.5 py-2 h-auto min-h-16"
          )}
        >
          <Link
            href="/dashboard"
            className={cn("min-w-0", !expanded && "flex justify-center w-full")}
            title="TRADUMUST"
          >
            {expanded ? (
              <LogoCompact />
            ) : (
              <LogoIcon className="h-9 w-9" />
            )}
          </Link>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-[var(--radius-md)] p-2 hover:bg-[var(--surface-muted)] shrink-0"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            aria-expanded={expanded}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto overflow-x-hidden", expanded ? "p-3" : "p-2")}>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={true}
              title={label}
              aria-label={label}
              className={cn(
                "flex items-center rounded-[var(--radius-md)] text-sm font-medium transition-colors",
                expanded ? "gap-3 px-3 py-2.5" : "justify-center px-0 py-2.5",
                pathname.startsWith(href)
                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              )}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {expanded && <span className="truncate">{label}</span>}
            </Link>
          ))}
        </nav>

        <div className={cn("shrink-0 border-t border-[var(--border)]", expanded ? "p-3" : "p-2")}>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className={cn(
              "flex w-full items-center rounded-[var(--radius-md)] text-sm text-[var(--error)] hover:bg-[var(--error-bg)]",
              expanded ? "gap-3 px-3 py-2.5" : "justify-center px-0 py-2.5"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            {expanded && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main column — offset by expanded or icon-rail width */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out",
          expanded ? "ml-64" : "ml-[4.5rem]"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-end border-b border-[var(--border)] bg-[var(--nav-bg)] px-4 shadow-sm lg:px-5">
          <div className="flex items-center gap-4">
            <div className="hidden min-w-[180px] items-center gap-4 text-sm font-semibold sm:flex">
              {mounted && token ? (
                <>
                  <span className="flex items-center gap-1.5 text-[var(--warning)]">
                    <Flame className="h-4 w-4" aria-hidden /> {streak}
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--brand-primary)]">
                    <Zap className="h-4 w-4" aria-hidden /> {xp} XP
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--brand-secondary)]">
                    <Trophy className="h-4 w-4" aria-hidden /> Lv.{level}
                  </span>
                </>
              ) : null}
            </div>
            <Link href="/profile" className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-secondary)] text-sm font-bold text-white"
                suppressHydrationWarning
              >
                {mounted ? (user?.name?.[0]?.toUpperCase() ?? "U") : "U"}
              </div>
            </Link>
          </div>
        </header>

        <main
          className="min-h-0 w-full flex-1 overflow-y-auto p-4 lg:p-5"
          id="main-content"
        >
          <div className="h-full w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
