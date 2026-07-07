"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/tradumust-api";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <Link href="/"><Logo /></Link>
        <h1 className="mt-6 text-2xl font-bold">Reset your password</h1>
        {sent ? (
          <p className="mt-4 text-[var(--text-secondary)]">If that email exists, a reset link has been sent.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 glass-panel p-8 rounded-2xl space-y-4">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)]"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold">
              Send reset link
            </button>
          </form>
        )}
        <Link href="/login" className="mt-4 inline-block text-sm text-[var(--brand-primary)]">Back to sign in</Link>
      </div>
    </div>
  );
}
