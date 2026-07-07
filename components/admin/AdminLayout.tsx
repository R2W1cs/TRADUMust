"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, BookOpen,
  Shield, LogOut, Activity, BarChart3, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/store/hooks";
import { useAppDispatch } from "@/lib/store/hooks";
import { logout } from "@/lib/store/slices/authSlice";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/lessons", label: "Lessons", icon: BookOpen },
  { href: "/admin/activity", label: "Activity", icon: ScrollText },
  { href: "/admin/system", label: "System", icon: Activity },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [mounted, setMounted] = useState(false);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && user && !isAdmin) router.replace("/dashboard");
  }, [mounted, user, isAdmin, router]);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#0B1120]" />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-slate-400">
        Access denied
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex">
      <aside className="fixed inset-y-0 left-0 w-60 bg-[#0F172A] border-r border-slate-800 flex flex-col z-50">
        <div className="h-16 px-5 flex items-center gap-2 border-b border-slate-800 shrink-0">
          <Shield className="w-6 h-6 text-amber-400" />
          <div>
            <p className="font-bold text-sm leading-tight">TRADUMUST</p>
            <p className="text-[10px] uppercase tracking-widest text-amber-400/80">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
          <div className="px-3 py-2 text-xs text-slate-500">
            <p className="font-medium text-slate-300 truncate">{user?.name}</p>
            <p className="truncate">{user?.role}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60"
          >
            <BarChart3 className="w-4 h-4" /> User app
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 h-14 bg-[#0B1120]/95 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <p className="text-sm text-slate-400">Platform monitoring & management</p>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
