"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/tradumust-api";

export default function AdminActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: adminApi.auditLogs,
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity log</h1>
        <p className="text-slate-400 mt-1">Audit trail of platform actions</p>
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-400">Loading activity…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500 bg-[#0B1120]">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Resource</th>
              </tr>
            </thead>
            <tbody>
              {(data?.logs ?? []).map((log) => (
                <tr key={log.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    {log.user ? (
                      <>
                        <p className="text-slate-200">{log.user.name}</p>
                        <p className="text-xs text-slate-500">{log.user.email}</p>
                      </>
                    ) : (
                      <span className="text-slate-500">System</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 text-amber-400">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{log.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && !data?.logs?.length && (
          <p className="p-6 text-slate-500">No audit logs yet.</p>
        )}
      </div>
    </div>
  );
}
