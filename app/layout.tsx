import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "TRADUMUST — AI Sign Language Platform",
  description:
    "Professional AI platform for hearing ↔ Deaf communication. ASL, BSL, and LSF translation, recognition, and learning — built for accessibility and institutional use.",
  keywords: [
    "sign language",
    "ASL",
    "BSL",
    "LSF",
    "accessibility",
    "deaf communication",
    "TRADUMUST",
    "WCAG",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${plex.variable} ${plex.className} min-h-screen bg-background text-foreground antialiased selection:bg-[var(--brand-primary)]/15`}
      >
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--brand-primary)] focus:text-white focus:rounded-[var(--radius-md)]"
          >
            Skip to main content
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
