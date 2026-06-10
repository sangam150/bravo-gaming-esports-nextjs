"use client";

import { useEffect, useRef, useState } from "react";
import { adminUpload } from "@/lib/admin-api";
import {
  formatUploadSize,
  IMAGE_FILE_INPUT_ACCEPT,
  IMAGE_UPLOAD_MAX_BYTES,
  type UploadType,
  validateImageUpload,
} from "@/lib/upload-config";

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
  const previewUrlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function resetPreviewObjectUrl() {
    if (!previewUrlRef.current) return;
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }

  async function handleFile(file: File) {
    const validationError = validateImageUpload({
      type,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    resetPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPreview(objectUrl);
    setUploading(true);
    setProgress(0);

    try {
      const res = await adminUpload(file, type, entityId || "draft", {
        onProgress: setProgress,
        previousUrl: currentUrl,
      });
      resetPreviewObjectUrl();
      setPreview(res.url);
      onUploaded(res.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      resetPreviewObjectUrl();
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function openFilePicker() {
    if (uploading) return;
    inputRef.current?.click();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_FILE_INPUT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }

          event.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (uploading) return;
          const file = event.dataTransfer.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        className={`rounded-card border-2 border-dashed p-4 transition ${
          dragActive
            ? "border-accent-blue bg-accent-blue/10"
            : "border-white/10 bg-bg-primary hover:border-white/20"
        } ${uploading ? "cursor-wait opacity-90" : "cursor-pointer"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {preview ? (
            <img
              src={preview}
              alt={`${label} preview`}
              className="h-24 w-24 rounded-xl border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-white/20 text-center text-xs text-text-muted">
              Drop image
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold text-white">
              {preview ? "Replace image" : "Upload image"}
            </p>
            <p className="text-xs text-text-muted">
              Drag and drop or click to choose a JPG, PNG, WEBP, GIF, or AVIF file.
            </p>
            <p className="text-xs text-text-muted">
              Max size: {formatUploadSize(IMAGE_UPLOAD_MAX_BYTES)}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
              disabled={uploading}
              className="btn-secondary !text-[11px] disabled:opacity-60"
            >
              {uploading ? `Uploading ${progress}%` : preview ? "Replace file" : "Choose file"}
            </button>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent-blue transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">{progress}% uploaded</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
