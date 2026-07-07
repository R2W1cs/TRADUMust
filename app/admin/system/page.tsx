"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/tradumust-api";
import { CheckCircle2, AlertCircle } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const healthy = status === "healthy";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${healthy ? "text-emerald-400" : "text-amber-400"}`}>
      {healthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {status}
    </span>
  );
}

export default function AdminSystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: adminApi.analytics,
  });

  const services = [
    { name: "Next.js frontend", port: "1234", status: "healthy" },
    { name: "Express API", port: "4000", status: "healthy" },
    { name: "Python AI", port: "8001", status: "healthy" },
    { name: "PostgreSQL", port: "5432", status: "healthy" },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System</h1>
        <p className="text-slate-400 mt-1">Service status and uptime</p>
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Platform</span>
          {isLoading ? (
            <span className="text-slate-500">Checking…</span>
          ) : (
            <StatusBadge status={data?.systemHealth?.status ?? "unknown"} />
          )}
        </div>
        {data?.systemHealth?.uptime != null && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">API uptime</span>
            <span className="text-slate-300 font-mono">
              {Math.floor(data.systemHealth.uptime / 3600)}h {Math.floor((data.systemHealth.uptime % 3600) / 60)}m
            </span>
          </div>
        )}
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-500 bg-[#0B1120]">
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">Port</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.name} className="border-b border-slate-800/60">
                <td className="px-5 py-3 text-slate-200">{s.name}</td>
                <td className="px-5 py-3 font-mono text-slate-500">{s.port}</td>
                <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Datasets</p>
          <p className="text-2xl font-bold mt-1">{data?.datasets ?? "—"}</p>
        </div>
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Active models</p>
          <p className="text-2xl font-bold mt-1">{data?.activeModels ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
