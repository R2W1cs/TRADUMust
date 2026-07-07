"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/tradumust-api";

export default function AdminLessonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: adminApi.lessons,
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Lessons & content</h1>
        <p className="text-slate-400 mt-1">All course units and exercise counts</p>
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-400">Loading lessons…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500 bg-[#0B1120]">
                <th className="px-5 py-3 font-medium">Lesson</th>
                <th className="px-5 py-3 font-medium">Unit</th>
                <th className="px-5 py-3 font-medium">Language</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Exercises</th>
                <th className="px-5 py-3 font-medium">XP reward</th>
              </tr>
            </thead>
            <tbody>
              {(data?.lessons ?? []).map((l) => (
                <tr key={l.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-medium text-slate-200">{l.title}</td>
                  <td className="px-5 py-3 text-slate-400">{l.unit.title}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-emerald-400">
                      {l.unit.signLanguage.code}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{l.category}</td>
                  <td className="px-5 py-3 text-slate-300">{l._count.exercises}</td>
                  <td className="px-5 py-3 text-amber-400">{l.xpReward}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && !data?.lessons?.length && (
          <p className="p-6 text-slate-500">No lessons in database.</p>
        )}
      </div>
    </div>
  );
}
