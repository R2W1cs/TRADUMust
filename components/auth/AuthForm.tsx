"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = mode === "login"
        ? await authApi.login({ email, password })
        : await authApi.register({ email, password, name });
      dispatch(setCredentials({ user: res.user as User, token: res.token }));
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 page-grid-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/"><Logo /></Link>
          <h1 className="mt-6 text-2xl font-bold text-[var(--foreground)]">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {mode === "login"
              ? "Sign in to continue learning sign language"
              : "Join TRADUMUST and break communication barriers"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card p-8 rounded-[var(--radius-lg)] space-y-5" noValidate>
          {mode === "register" && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">Full name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--input-bg)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--input-bg)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--input-bg)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] pr-12"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          {mode === "login" && (
            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-[var(--brand-primary)] hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--panel-border)]" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-[var(--panel-bg)] text-[var(--text-muted)]">or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="py-2.5 rounded-xl border border-[var(--panel-border)] text-sm font-medium hover:bg-[var(--panel-bg)]">
              Google
            </button>
            <button type="button" className="py-2.5 rounded-xl border border-[var(--panel-border)] text-sm font-medium hover:bg-[var(--panel-bg)]">
              GitHub
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {mode === "login" ? (
            <>Don&apos;t have an account? <Link href="/register" className="text-[var(--brand-primary)] font-medium hover:underline">Register</Link></>
          ) : (
            <>Already have an account? <Link href="/login" className="text-[var(--brand-primary)] font-medium hover:underline">Sign in</Link></>
          )}
        </p>
      </motion.div>
    </div>
  );
}
