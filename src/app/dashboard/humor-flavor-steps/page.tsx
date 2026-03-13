"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useEffect, useState, useCallback } from "react";

export default function HumorFlavorStepsPage() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("humor_flavor_steps").select("*");
    setRows(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const filtered = search
    ? rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase())))
    : rows;

  const formatHeader = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const formatValue = (key: string, value: unknown) => {
    if (value === null || value === undefined) return <span className="text-gray-600">—</span>;
    if (key === "id") return <span className="font-mono text-xs">{String(value).slice(0, 8)}</span>;
    if (key.includes("datetime") || key.includes("_at")) return new Date(String(value)).toLocaleString();
    if (typeof value === "boolean") return value ? <span className="text-green-400">Yes</span> : <span className="text-red-400">No</span>;
    if (typeof value === "object") return <span className="font-mono text-xs text-gray-400">{JSON.stringify(value).slice(0, 80)}</span>;
    const str = String(value);
    return str.length > 100 ? str.slice(0, 100) + "…" : str;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Humor Flavor Steps</h1>
      <div className="mb-6">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/40 w-72" />
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-pink-500"></div></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No data found</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-pink-500/20">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>{columns.map((col) => (<th key={col} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{formatHeader(col)}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((row, i) => (
                <tr key={i} className="hover:bg-zinc-900/50">
                  {columns.map((col) => (<td key={col} className="px-4 py-3 text-gray-300">{formatValue(col, row[col])}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length === 0 && rows.length > 0 && !loading && (
        <p className="text-center text-gray-500 py-12">No results match your search</p>
      )}
      <p className="text-xs text-gray-600 mt-4">{filtered.length} of {rows.length} records</p>
    </div>
  );
}
