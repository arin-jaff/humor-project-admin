"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useEffect, useState, useCallback } from "react";

export default function AllowedSignupDomainsPage() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const TABLE = "allowed_signup_domains";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUserId(data.user?.id ?? null); });
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from(TABLE).select("*");
    setRows(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const editableColumns = columns.filter(
    (c) => !["id", "created_datetime_utc", "modified_datetime_utc", "created_at", "updated_at", "created_by_user_id", "modified_by_user_id"].includes(c)
  );

  const filtered = search
    ? rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase())))
    : rows;

  const formatHeader = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Allowed Signup Domains</h1>
        <button onClick={() => setShowCreate(true)} className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          + Add Domain
        </button>
      </div>

      <div className="mb-6">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/40 w-72" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-pink-500"></div></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No records found</p>
          <button onClick={() => setShowCreate(true)} className="text-pink-400 hover:text-pink-300 text-sm">Create the first one</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-pink-500/20">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                {columns.map((col) => (<th key={col} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{formatHeader(col)}</th>))}
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((row, i) => (
                <tr key={i} className="hover:bg-zinc-900/50">
                  {columns.map((col) => (<td key={col} className="px-4 py-3 text-gray-300">{formatValue(col, row[col])}</td>))}
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => setEditRow(row)} className="text-xs text-pink-400 hover:text-pink-300">Edit</button>
                      <button onClick={() => setDeleteRow(row)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  </td>
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

      {showCreate && (
        <FormModal
          title={"Create Domain"}
          columns={editableColumns}
          initialValues={{}}
          onClose={() => setShowCreate(false)}
          onSave={async (values) => {
            await supabase.from(TABLE).insert({ ...values, created_by_user_id: userId, modified_by_user_id: userId });
            fetchData();
          }}
        />
      )}
      {editRow && (
        <FormModal
          title={"Edit Domain"}
          columns={editableColumns}
          initialValues={editRow}
          onClose={() => setEditRow(null)}
          onSave={async (values) => {
            await supabase.from(TABLE).update({ ...values, modified_by_user_id: userId }).eq("id", editRow.id);
            fetchData();
          }}
        />
      )}
      {deleteRow && (
        <DeleteModal
          label={String(deleteRow[editableColumns[0]] || deleteRow.id || "")}
          onClose={() => setDeleteRow(null)}
          onConfirm={async () => {
            await supabase.from(TABLE).delete().eq("id", deleteRow.id);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function FormModal({ title, columns, initialValues, onClose, onSave }: {
  title: string; columns: string[]; initialValues: Record<string, unknown>; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    columns.forEach((c) => { v[c] = String(initialValues[c] ?? ""); });
    return v;
  });
  const [saving, setSaving] = useState(false);

  const formatHeader = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const handleSave = async () => {
    setSaving(true);
    const parsed: Record<string, unknown> = {};
    columns.forEach((c) => {
      const v = values[c];
      if (v === "" || v === "null") { parsed[c] = null; }
      else if (v === "true") { parsed[c] = true; }
      else if (v === "false") { parsed[c] = false; }
      else if (!isNaN(Number(v)) && v.trim() !== "") { parsed[c] = Number(v); }
      else { parsed[c] = v; }
    });
    await onSave(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <div className="space-y-4">
          {columns.map((col) => (
            <div key={col}>
              <label className="text-sm text-gray-400 mb-1 block">{formatHeader(col)}</label>
              <input type="text" value={values[col] || ""} onChange={(e) => setValues({ ...values, [col]: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-pink-500/40" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ label, onClose, onConfirm }: { label: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-2">Delete Record?</h2>
        <p className="text-sm text-gray-400 mb-4">This action cannot be undone. This will permanently delete <span className="text-white font-medium">{label}</span>.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
