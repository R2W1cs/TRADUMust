"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { historyApi } from "@/lib/tradumust-api";
import { Star, Trash2, Download } from "lucide-react";

export default function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => historyApi.list() });

  const items = (data as { items?: Array<{ id: string; inputText: string; outputText: string | null; signLanguage: string; createdAt: string; isFavorite: boolean }> })?.items || [];

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Translation History</h1>
            <p className="text-[var(--text-secondary)]">Your saved translations and recognitions</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--panel-border)] text-sm hover:bg-[var(--panel-bg)]">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {isLoading ? (
          <p className="text-[var(--text-secondary)]">Loading...</p>
        ) : items.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center text-[var(--text-secondary)]">
            No history yet. Start translating or recognizing signs!
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="glass-panel p-5 rounded-2xl flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[var(--brand-primary)]">{item.signLanguage}</span>
                  <p className="font-medium mt-1">{item.inputText}</p>
                  {item.outputText && <p className="text-sm text-[var(--text-secondary)] mt-1">{item.outputText}</p>}
                  <p className="text-xs text-[var(--text-muted)] mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg hover:bg-[var(--panel-bg)]" aria-label="Favorite">
                    <Star className={`w-4 h-4 ${item.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-red-500/10 text-red-500" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
