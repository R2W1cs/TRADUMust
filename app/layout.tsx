import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";

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
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500/20 relative overflow-x-hidden`}>
        <ThemeProvider>
          {/* Animated Background Mesh */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-[1]">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-300/20 blur-[120px] animate-blob" style={{ animationDelay: "0s" }}></div>
            <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] rounded-full bg-sky-300/15 blur-[120px] animate-blob" style={{ animationDelay: "2s" }}></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full bg-violet-200/15 blur-[120px] animate-blob" style={{ animationDelay: "4s" }}></div>
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

