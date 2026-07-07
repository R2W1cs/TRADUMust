import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Container } from "@/components/ui/Container";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          <div className="max-w-xs">
            <Logo iconClass="w-8 h-8" textClass="text-base" />
            <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">
              AI-powered sign language translation and learning for institutions,
              educators, and inclusive communication.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="overline text-[var(--text-muted)] mb-3">Product</p>
              <ul className="space-y-2">
                <li><Link href="/sign" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">Text → Avatar</Link></li>
                <li><Link href="/sign" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">Sign Studio</Link></li>
                <li><Link href="/learn" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">Learn</Link></li>
              </ul>
            </div>
            <div>
              <p className="overline text-[var(--text-muted)] mb-3">Account</p>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">Sign in</Link></li>
                <li><Link href="/register" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">Register</Link></li>
                <li><Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <p className="overline text-[var(--text-muted)] mb-3">Support</p>
              <ul className="space-y-2">
                <li><Link href="#faq" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">FAQ</Link></li>
                <li><a href="mailto:hello@tradumust.com" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} TRADUMUST. All rights reserved.</p>
          <p>WCAG 2.2 · ASL · BSL · LSF</p>
        </div>
      </Container>
    </footer>
  );
}
