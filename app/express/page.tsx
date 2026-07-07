"use client";

import Link from "next/link";
import { ExternalLink, HandMetal } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ExpressSigner } from "@/components/ExpressSigner";
import { ASL_AVATAR_3D_ORIGIN } from "@/lib/asl-avatar-3d";
import { TSL_SIGN_COUNT } from "@/lib/tsl-vocabulary";

export default function ExpressPage() {
  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <HandMetal className="w-7 h-7 text-indigo-500" />
              Express
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
              Native signing per language: ASL and ALSL on the CWASA 3D avatar; TSL uses{" "}
              {TSL_SIGN_COUNT} real reference photos from the Tunisian Sign Language dataset.
            </p>
          </div>
          <a
            href={ASL_AVATAR_3D_ORIGIN}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:underline"
          >
            ALSL gloss browser <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="surface-card p-6 rounded-[var(--radius-lg)]">
          <ExpressSigner defaultLanguage="ASL" minHeight={480} />
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center">
          CWASA 3D for ASL/ALSL · TSL photo signs from{" "}
          <Link href="/learn" className="text-emerald-500 hover:underline">
            Learn → TSL
          </Link>
          . Each mode uses authentic language-specific data — no cross-language proxy.
        </p>
      </div>
    </DashboardLayout>
  );
}
