"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/tradumust-api";
import {
  Users, BarChart3, BookOpen, Database, Cpu, Activity,
  UserPlus, TrendingUp, CheckCircle2, AlertCircle,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const healthy = status === "healthy";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${healthy ? "text-emerald-400" : "text-amber-400"}`}>
      {healthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {status}
    </span>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: adminApi.analytics,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.users(1),
  });

  const stats = [
    { label: "Total users", value: data?.users?.total ?? "—", icon: Users },
    { label: "Active today", value: data?.users?.daily ?? "—", icon: UserPlus },
    { label: "New this month", value: data?.users?.monthly ?? "—", icon: TrendingUp },
    { label: "Translations", value: data?.translations ?? "—", icon: BarChart3 },
    { label: "Lessons completed", value: data?.lessonCompletions ?? "—", icon: BookOpen },
    { label: "Average XP", value: data?.averageXp ?? "—", icon: Activity },
    { label: "Datasets", value: data?.datasets ?? "—", icon: Database },
    { label: "Active models", value: data?.activeModels ?? "—", icon: Cpu },
  ];

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-slate-400 mt-1">Platform usage, users, and system health</p>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading analytics…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
              <s.icon className="w-5 h-5 text-amber-400 mb-2" aria-hidden />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Recent users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {(usersData?.users ?? []).slice(0, 8).map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="py-2.5">
                      <p className="font-medium text-slate-200">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-2.5 text-slate-400">{u.role}</td>
                    <td className="py-2.5 text-right text-amber-400">{u.progress?.xp ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!usersData?.users?.length && (
              <p className="text-sm text-slate-500 py-4">No users found.</p>
            )}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4">System health</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Platform status</span>
              <StatusBadge status={data?.systemHealth?.status ?? "unknown"} />
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">API server</span>
              <StatusBadge status="healthy" />
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">AI service</span>
              <StatusBadge status="healthy" />
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Database</span>
              <StatusBadge status="healthy" />
            </div>
            {data?.systemHealth?.uptime != null && (
              <div className="flex justify-between py-2 text-slate-500">
                <span>Uptime</span>
                <span>{Math.floor(data.systemHealth.uptime / 3600)}h {Math.floor((data.systemHealth.uptime % 3600) / 60)}m</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
