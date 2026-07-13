"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthWelcomeGate } from "@/components/auth/AuthWelcomeGate";
import { authApi } from "@/lib/tradumust-api";
import { useAppDispatch } from "@/lib/store/hooks";
import { setCredentials } from "@/lib/store/slices/authSlice";
import type { User } from "@/lib/store/slices/authSlice";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | undefined>();

  const goDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await authApi.login({ email, password })
          : await authApi.register({ email, password, name });
      const user = res.user as User;
      dispatch(setCredentials({ user, token: res.token }));
      setWelcomeName(user?.name || name || undefined);
      setWelcomeOpen(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center p-6 page-grid-bg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: welcomeOpen ? 0.35 : 1, y: 0, scale: welcomeOpen ? 0.98 : 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <Link href="/">
              <Logo />
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-[var(--foreground)]">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              {mode === "login"
                ? "Sign in to continue learning sign language"
                : "Join TRADUMUST and break communication barriers"}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="surface-card space-y-5 rounded-[var(--radius-lg)] p-8"
            noValidate
          >
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || welcomeOpen}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] py-3 font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>

            {mode === "login" && (
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--brand-primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--panel-border)]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[var(--panel-bg)] px-2 text-[var(--text-muted)]">
                  or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-xl border border-[var(--panel-border)] py-2.5 text-sm font-medium hover:bg-[var(--panel-bg)]"
              >
                Google
              </button>
              <button
                type="button"
                className="rounded-xl border border-[var(--panel-border)] py-2.5 text-sm font-medium hover:bg-[var(--panel-bg)]"
              >
                GitHub
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-[var(--brand-primary)] hover:underline"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[var(--brand-primary)] hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </motion.div>
      </div>

      <AuthWelcomeGate
        open={welcomeOpen}
        mode={mode}
        userName={welcomeName}
        onContinue={goDashboard}
      />
    </>
  );
}
