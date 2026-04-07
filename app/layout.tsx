import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TRADUMUST",
  description:
    "An educational translation and sign language platform designed for exchange students and inclusive communication — with cultural context built into every translation.",
  keywords: ["translation", "sign language", "exchange students", "ASL", "cultural context", "accessibility", "TRADUMUST"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
