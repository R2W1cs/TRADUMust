"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, HandMetal, GraduationCap, History,
  User, LogOut, PanelLeft, PanelLeftClose, Flame, Zap, Trophy, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoCompact } from "@/components/Logo";
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

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Sidebar — fixed width; content never sits behind it */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--nav-bg)] transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
        aria-hidden={!sidebarOpen}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] p-4">
          <Link href="/dashboard"><LogoCompact /></Link>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-[var(--radius-md)] p-2 hover:bg-[var(--surface-muted)]"
            aria-label="Close navigation"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  dispatch(toggleSidebar());
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              )}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-[var(--error)] hover:bg-[var(--error-bg)]"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mounted && sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Close menu"
        />
      )}

      {/* Main column — width = viewport minus sidebar when open */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out",
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--nav-bg)] px-4 shadow-sm lg:px-5">
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-[var(--radius-md)] p-2 hover:bg-[var(--surface-muted)]"
            aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </button>

          <div className="ml-auto flex items-center gap-4">
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
