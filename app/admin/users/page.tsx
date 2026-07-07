"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/tradumust-api";

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: () => adminApi.users(1),
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400 mt-1">Monitor all registered learners and admins</p>
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-400">Loading users…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500 bg-[#0B1120]">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Level</th>
                <th className="px-5 py-3 font-medium">XP</th>
                <th className="px-5 py-3 font-medium">Streak</th>
                <th className="px-5 py-3 font-medium">Lives</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-200">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">{u.role}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{u.progress?.level ?? 1}</td>
                  <td className="px-5 py-3 text-amber-400 font-semibold">{u.progress?.xp ?? 0}</td>
                  <td className="px-5 py-3 text-orange-400">{u.progress?.dailyStreak ?? 0}</td>
                  <td className="px-5 py-3 text-red-400">{u.progress?.lives ?? 5}</td>
                  <td className="px-5 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-5 py-3 border-t border-slate-800 text-xs text-slate-500">
          Total: {data?.total ?? 0} users
        </div>
      </div>
    </div>
  );
}
