"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useEffect, useState, useCallback } from "react";

interface ImageRow {
  id: string;
  url: string;
  image_description: string | null;
  is_public: boolean;
  created_datetime_utc: string;
  caption_count?: number;
}

export default function ImagesPage() {
  const supabase = createSupabaseBrowserClient();
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const [captionFilter, setCaptionFilter] = useState<"all" | "has" | "none">("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editImage, setEditImage] = useState<ImageRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageRow | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("images")
      .select("id, url, image_description, is_public, created_datetime_utc, captions(id)")
      .order("created_datetime_utc", { ascending: false });

    const mapped = (data || []).map((img: Record<string, unknown>) => ({
      id: img.id as string,
      url: img.url as string,
      image_description: img.image_description as string | null,
      is_public: img.is_public as boolean,
      created_datetime_utc: img.created_datetime_utc as string,
      caption_count: Array.isArray(img.captions) ? img.captions.length : 0,
    }));
    setImages(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const filtered = images.filter((img) => {
    if (filter === "public" && !img.is_public) return false;
    if (filter === "private" && img.is_public) return false;
    if (captionFilter === "has" && (img.caption_count || 0) === 0) return false;
    if (captionFilter === "none" && (img.caption_count || 0) > 0) return false;
    if (search && !(img.image_description || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Images</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + Add Image
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/40"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "public" | "private")} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-gray-300">
          <option value="all">All Visibility</option>
          <option value="public">Public Only</option>
          <option value="private">Private Only</option>
        </select>
        <select value={captionFilter} onChange={(e) => setCaptionFilter(e.target.value as "all" | "has" | "none")} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-gray-300">
          <option value="all">All Captions</option>
          <option value="has">Has Captions</option>
          <option value="none">No Captions</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-pink-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((img) => (
            <div key={img.id} className="bg-zinc-900 border border-pink-500/20 rounded-2xl overflow-hidden group">
              <div className="relative aspect-square">
                <img src={img.url} alt={img.image_description || ""} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${img.is_public ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {img.is_public ? "Public" : "Private"}
                  </span>
                </div>
                <div className="absolute top-2 right-2 bg-zinc-900/80 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                  {img.caption_count} captions
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-300 line-clamp-2 mb-2">{img.image_description || "No description"}</p>
                <p className="text-xs text-gray-600 mb-3">{new Date(img.created_datetime_utc).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <button onClick={() => setEditImage(img)} className="text-xs text-pink-400 hover:text-pink-300 transition-colors">Edit</button>
                  <button onClick={() => setDeleteTarget(img)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-12">No images match your filters</p>
      )}

      {/* Create Modal */}
      {showCreate && <CreateImageModal supabase={supabase} onClose={() => setShowCreate(false)} onCreated={fetchImages} />}
      {editImage && <EditImageModal supabase={supabase} image={editImage} onClose={() => setEditImage(null)} onUpdated={fetchImages} />}
      {deleteTarget && <DeleteConfirmModal supabase={supabase} image={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={fetchImages} />}
    </div>
  );
}

function CreateImageModal({ supabase, onClose, onCreated }: { supabase: ReturnType<typeof createSupabaseBrowserClient>; onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const handleUploadFile = async (): Promise<string | null> => {
    if (!file) return null;
    setStatus("Getting upload URL...");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setStatus("Not authenticated"); return null; }
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const presignRes = await fetch("https://api.almostcrackd.ai/pipeline/generate-presigned-url", {
      method: "POST", headers, body: JSON.stringify({ contentType: file.type }),
    });
    if (!presignRes.ok) { setStatus("Failed to get presigned URL"); return null; }
    const { presignedUrl, cdnUrl } = await presignRes.json();

    setStatus("Uploading file...");
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT", headers: { "Content-Type": file.type }, body: file,
    });
    if (!uploadRes.ok) { setStatus("Upload failed"); return null; }

    setStatus("Registering image...");
    const registerRes = await fetch("https://api.almostcrackd.ai/pipeline/upload-image-from-url", {
      method: "POST", headers, body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
    });
    if (!registerRes.ok) { setStatus("Failed to register image"); return null; }

    return cdnUrl;
  };

  const handleCreate = async () => {
    if (mode === "url" && !url.trim()) return;
    if (mode === "upload" && !file) return;
    setSaving(true);
    setStatus("");

    let finalUrl = url.trim();
    if (mode === "upload") {
      const uploaded = await handleUploadFile();
      if (!uploaded) { setSaving(false); return; }
      finalUrl = uploaded;
    }

    setStatus("Saving to database...");
    const now = new Date().toISOString();
    await supabase.from("images").insert({
      url: finalUrl,
      image_description: desc.trim() || null,
      is_public: isPublic,
      created_datetime_utc: now,
      modified_datetime_utc: now,
    });
    onCreated();
    onClose();
  };

  const canSubmit = mode === "url" ? url.trim() !== "" : file !== null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Add Image</h2>
        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setMode("url")} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${mode === "url" ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "text-gray-400 hover:text-white"}`}>
              URL
            </button>
            <button onClick={() => setMode("upload")} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${mode === "upload" ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "text-gray-400 hover:text-white"}`}>
              Upload File
            </button>
          </div>
          {mode === "url" ? (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Image URL *</label>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-pink-500/40" placeholder="https://..." />
            </div>
          ) : (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Image File *</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-pink-500/20 file:text-pink-400 hover:file:bg-pink-500/30" />
              {file && <p className="text-xs text-gray-500 mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
            </div>
          )}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-pink-500/40 resize-none" rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-pink-500" />
            Public
          </label>
          {status && <p className="text-xs text-yellow-400">{status}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !canSubmit} className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditImageModal({ supabase, image, onClose, onUpdated }: { supabase: ReturnType<typeof createSupabaseBrowserClient>; image: ImageRow; onClose: () => void; onUpdated: () => void }) {
  const [desc, setDesc] = useState(image.image_description || "");
  const [isPublic, setIsPublic] = useState(image.is_public);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setSaving(true);
    await supabase.from("images").update({
      image_description: desc.trim() || null,
      is_public: isPublic,
      modified_datetime_utc: new Date().toISOString(),
    }).eq("id", image.id);
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Edit Image</h2>
        <img src={image.url} alt="" className="w-full h-40 object-cover rounded-xl mb-4" />
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-pink-500/40 resize-none" rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-pink-500" />
            Public
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button onClick={handleUpdate} disabled={saving} className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ supabase, image, onClose, onDeleted }: { supabase: ReturnType<typeof createSupabaseBrowserClient>; image: ImageRow; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from("images").delete().eq("id", image.id);
    onDeleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-2">Delete Image?</h2>
        <p className="text-sm text-gray-400 mb-4">This action cannot be undone. The image and all associated data will be removed.</p>
        <img src={image.url} alt="" className="w-full h-32 object-cover rounded-xl mb-4 opacity-50" />
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
