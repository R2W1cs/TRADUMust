"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { useTheme } from "@/lib/theme-context";
import { setAccessibility } from "@/lib/store/slices/uiSlice";
import { updateUser } from "@/lib/store/slices/authSlice";
import { setLanguage } from "@/lib/store/slices/learnSlice";
import { usersApi } from "@/lib/tradumust-api";
import { Award, Settings, Bell, Sun, Moon, Type, Contrast } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGN_LANGUAGE_CODES, type SignLanguageCode } from "@/lib/sign-languages";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user, token } = useAppSelector((s) => s.auth);
  const { highContrast, largeText, reducedMotion } = useAppSelector((s) => s.ui);
  const { mode, setMode } = useTheme();
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: usersApi.profile,
    enabled: !!token,
  });

  const profileUser = profileData?.user ?? user;
  const certificates = profileData?.user?.certificates ?? [];

  const updateProfile = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: ({ user: u }) => {
      dispatch(updateUser(u));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const handleLanguageChange = async (lang: SignLanguageCode) => {
    dispatch(setLanguage(lang));
    if (!token) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ preferredLanguage: lang });
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (next: "light" | "dark") => {
    setMode(next);
    dispatch(updateUser({ theme: next }));
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-semibold">Profile</h1>

        <Card padding="lg" className="flex items-center gap-6">
          <div
            className="w-16 h-16 rounded-[var(--radius-lg)] bg-[var(--brand-secondary)] flex items-center justify-center text-white text-2xl font-semibold shrink-0"
            suppressHydrationWarning
          >
            {mounted ? (profileUser?.name?.[0]?.toUpperCase() ?? "U") : "U"}
          </div>
          <div suppressHydrationWarning>
            <h2 className="text-lg font-semibold">{mounted ? (profileUser?.name || "Guest") : "Guest"}</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              {mounted ? (profileUser?.email || "Not signed in") : "Not signed in"}
            </p>
            <p className="text-xs text-[var(--brand-primary)] mt-1 font-medium uppercase tracking-wide">
              {mounted ? (profileUser?.role || "GUEST") : "GUEST"}
            </p>
          </div>
        </Card>

        <Card padding="md">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" aria-hidden /> Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
              <span className="text-sm flex items-center gap-2">
                {mode === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Theme
              </span>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleThemeChange(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-[var(--radius-md)] text-sm border capitalize transition-colors",
                      mode === t
                        ? "bg-[var(--brand-primary)] text-white border-transparent"
                        : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
              <span className="text-sm">Preferred sign language</span>
              <select
                value={profileUser?.preferredLanguage || "ASL"}
                disabled={saving}
                onChange={(e) => handleLanguageChange(e.target.value as SignLanguageCode)}
                className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--input-bg)] text-sm"
              >
                {SIGN_LANGUAGE_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border)]">
              <span className="text-sm flex items-center gap-2 min-w-0">
                <Contrast className="w-4 h-4 shrink-0" aria-hidden /> High contrast
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={highContrast}
                onClick={() => dispatch(setAccessibility({ highContrast: !highContrast }))}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  highContrast ? "bg-[var(--brand-primary)]" : "bg-[var(--border)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200",
                    highContrast ? "left-[1.375rem]" : "left-0.5"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border)]">
              <span className="text-sm flex items-center gap-2 min-w-0">
                <Type className="w-4 h-4 shrink-0" aria-hidden /> Large text
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={largeText}
                onClick={() => dispatch(setAccessibility({ largeText: !largeText }))}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  largeText ? "bg-[var(--brand-primary)]" : "bg-[var(--border)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200",
                    largeText ? "left-[1.375rem]" : "left-0.5"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm min-w-0">Reduce motion</span>
              <button
                type="button"
                role="switch"
                aria-checked={reducedMotion}
                onClick={() => dispatch(setAccessibility({ reducedMotion: !reducedMotion }))}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  reducedMotion ? "bg-[var(--brand-primary)]" : "bg-[var(--border)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200",
                    reducedMotion ? "left-[1.375rem]" : "left-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Award className="w-5 h-5" aria-hidden /> Certificates
          </h2>
          {!mounted ? (
            <p className="text-sm text-[var(--text-secondary)]" suppressHydrationWarning>
              Loading certificates…
            </p>
          ) : !token ? (
            <p className="text-sm text-[var(--text-secondary)]">Sign in to view certificates.</p>
          ) : certificates.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Complete all units to earn certificates.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {certificates.map((c) => (
                <li key={c.id} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span>{c.title}</span>
                  <span className="text-[var(--text-muted)]">{c.language}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5" aria-hidden /> Notifications
          </h2>
          <p className="text-sm text-[var(--text-muted)]">Notification preferences will be available in a future update.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
