import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = createSupabaseServerClient();

  const [profilesRes, captionsRes, votesRes] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("captions").select("id, profile_id"),
    supabase.from("caption_votes").select("id, profile_id"),
  ]);

  const profiles = profilesRes.data || [];
  const captions = captionsRes.data || [];
  const votes = votesRes.data || [];

  // Count captions per profile
  const captionCounts: Record<string, number> = {};
  captions.forEach((c: { id: string; profile_id?: string }) => {
    if (c.profile_id) captionCounts[c.profile_id] = (captionCounts[c.profile_id] || 0) + 1;
  });

  // Count votes per profile
  const voteCounts: Record<string, number> = {};
  votes.forEach((v) => {
    voteCounts[v.profile_id] = (voteCounts[v.profile_id] || 0) + 1;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>
      <UsersTable profiles={profiles} captionCounts={captionCounts} voteCounts={voteCounts} />
    </div>
  );
}

function UsersTable({
  profiles,
  captionCounts,
  voteCounts,
}: {
  profiles: Array<{ id: string; is_superadmin?: boolean; email?: string; full_name?: string; avatar_url?: string }>;
  captionCounts: Record<string, number>;
  voteCounts: Record<string, number>;
}) {
  return (
    <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">User</th>
              <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">User ID</th>
              <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Role</th>
              <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Captions</th>
              <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Votes</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className={`border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${p.is_superadmin ? "bg-pink-500/5" : ""}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                        {(p.full_name || p.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{p.full_name || "—"}</p>
                      <p className="text-gray-500 text-xs">{p.email || "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 font-mono">{p.id.slice(0, 8)}...</td>
                <td className="px-6 py-4">
                  {p.is_superadmin ? (
                    <span className="bg-pink-500/20 text-pink-400 text-xs px-2 py-1 rounded-full font-medium">Superadmin</span>
                  ) : (
                    <span className="text-gray-500 text-xs">User</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm">{captionCounts[p.id] || 0}</td>
                <td className="px-6 py-4 text-gray-300 text-sm">{voteCounts[p.id] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {profiles.length === 0 && <p className="text-center text-gray-500 py-8">No users found</p>}
    </div>
  );
}
