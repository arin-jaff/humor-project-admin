"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useEffect, useState } from "react";

interface CaptionRow {
  id: string;
  content: string;
  image_id: string;
  created_datetime_utc: string;
  net: number;
  upvotes: number;
  downvotes: number;
  total: number;
  wordCount: number;
  controversy: number;
}

interface ImageGroup {
  image_id: string;
  url: string;
  captions: CaptionRow[];
}

type SortKey = "net" | "controversy" | "length" | "date";

export default function CaptionsPage() {
  const supabase = createSupabaseBrowserClient();
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("net");

  useEffect(() => {
    async function load() {
      const [imagesRes, captionsRes, votesRes] = await Promise.all([
        supabase.from("images").select("id, url"),
        supabase.from("captions").select("id, content, image_id, created_datetime_utc"),
        supabase.from("caption_votes").select("caption_id, vote_value"),
      ]);

      const images = imagesRes.data || [];
      const captions = captionsRes.data || [];
      const votes = votesRes.data || [];

      const voteMap: Record<string, { up: number; down: number }> = {};
      votes.forEach((v) => {
        if (!voteMap[v.caption_id]) voteMap[v.caption_id] = { up: 0, down: 0 };
        if (v.vote_value === 1) voteMap[v.caption_id].up++;
        else voteMap[v.caption_id].down++;
      });

      const imageMap = new Map(images.map((i) => [i.id, i.url]));
      const groupMap: Record<string, CaptionRow[]> = {};

      captions.forEach((c) => {
        const v = voteMap[c.id] || { up: 0, down: 0 };
        const total = v.up + v.down;
        const net = v.up - v.down;
        const controversy = total >= 2 ? total * (1 - Math.abs(v.up - v.down) / total) : 0;
        const wordCount = (c.content || "").trim().split(/\s+/).length;

        const row: CaptionRow = {
          id: c.id,
          content: c.content,
          image_id: c.image_id,
          created_datetime_utc: c.created_datetime_utc,
          net,
          upvotes: v.up,
          downvotes: v.down,
          total,
          wordCount,
          controversy,
        };

        if (!groupMap[c.image_id]) groupMap[c.image_id] = [];
        groupMap[c.image_id].push(row);
      });

      const result: ImageGroup[] = Object.entries(groupMap).map(([image_id, caps]) => ({
        image_id,
        url: imageMap.get(image_id) || "",
        captions: caps,
      }));

      setGroups(result);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const sortFn = (a: CaptionRow, b: CaptionRow) => {
    switch (sort) {
      case "net": return b.net - a.net;
      case "controversy": return b.controversy - a.controversy;
      case "length": return b.wordCount - a.wordCount;
      case "date": return new Date(b.created_datetime_utc).getTime() - new Date(a.created_datetime_utc).getTime();
      default: return 0;
    }
  };

  const sortedGroups = groups.map((g) => ({
    ...g,
    captions: [...g.captions].sort(sortFn),
  }));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Captions</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-gray-300"
        >
          <option value="net">Sort by Net Score</option>
          <option value="controversy">Sort by Controversy</option>
          <option value="length">Sort by Length</option>
          <option value="date">Sort by Date</option>
        </select>
      </div>

      <div className="space-y-6">
        {sortedGroups.map((group) => (
          <div key={group.image_id} className="bg-zinc-900 border border-pink-500/20 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
              {group.url && (
                <img src={group.url} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
              )}
              <div>
                <p className="text-sm text-gray-400">{group.captions.length} captions</p>
                <p className="text-xs text-gray-600 font-mono">{group.image_id.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="divide-y divide-zinc-800">
              {group.captions.map((c) => (
                <div key={c.id} className={`px-6 py-3 flex items-center justify-between ${c.net < 0 ? "bg-red-500/5" : c.net > 0 ? "bg-green-500/5" : ""}`}>
                  <div className="flex-1 min-w-0 mr-4">
                    <p className={`text-sm ${c.net < 0 ? "text-red-400" : c.net > 0 ? "text-green-400" : "text-gray-300"}`}>
                      {c.content}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {c.wordCount} words &middot; {new Date(c.created_datetime_utc).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-mono font-bold ${c.net < 0 ? "text-red-400" : c.net > 0 ? "text-green-400" : "text-gray-500"}`}>
                      {c.net > 0 ? "+" : ""}{c.net}
                    </span>
                    <span className="text-xs text-gray-600">{c.total} votes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && <p className="text-center text-gray-500 py-12">No captions found</p>}
    </div>
  );
}
