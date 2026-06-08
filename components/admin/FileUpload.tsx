"use client";

import { useRef, useState } from "react";
import { adminUpload } from "@/lib/admin-api";

type UploadType = "team_logo" | "player_avatar" | "tournament_banner" | "match_screenshot";

export default function FileUpload({
  type,
  entityId,
  label,
  currentUrl,
  onUploaded,
}: {
  type: UploadType;
  entityId: string;
  label: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const res = await adminUpload(file, type, entityId || "draft");
      onUploaded(res.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        {preview ? (
          <img src={preview} alt="" className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-text-muted">
            No image
          </div>
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary !text-[11px] disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Choose file"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
