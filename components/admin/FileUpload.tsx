"use client";

import { adminUpload } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { formatUploadSize, getUploadMaxBytes, IMAGE_FILE_INPUT_ACCEPT, type UploadType } from "@/lib/upload-config";
import { validateImageUpload } from "@/lib/upload-validation";
import { toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
  const [notice, setNotice] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return scheduleEffectTask(() => setPreview(currentUrl ?? null));
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
      setNotice(null);
      return;
    }

    setError(null);
    setNotice("Uploading to Cloudflare R2...");
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
      setNotice("Upload complete.");
    } catch (err: unknown) {
      setError(
        toUserFacingErrorMessage(err, {
          fallback: USER_FACING_ERROR_MESSAGES.admin,
        }),
      );
      setNotice(null);
      resetPreviewObjectUrl();
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  async function handleCopyUrl() {
    const persistedUrl = currentUrl?.trim() || (preview && !preview.startsWith("blob:") ? preview : "");

    if (!persistedUrl) return;

    try {
      await navigator.clipboard.writeText(persistedUrl);
      setError(null);
      setNotice("URL copied.");
    } catch {
      setError("We couldn't copy that URL right now. Please try again manually.");
    }
  }

  function handleClearImage() {
    if (uploading) return;
    resetPreviewObjectUrl();
    setPreview(null);
    setError(null);
    setNotice("Image cleared. Save the form to keep this change.");
    onUploaded("");
  }

  function openFilePicker() {
    if (uploading) return;
    inputRef.current?.click();
  }

  const persistedUrl = currentUrl?.trim() || (preview && !preview.startsWith("blob:") ? preview : "");
  const maxUploadSizeLabel = formatUploadSize(getUploadMaxBytes(type));

  return (
    <div aria-busy={uploading} className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <input
        ref={inputRef}
        aria-label={`Choose ${label} image file`}
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
          dragActive ? "border-accent-blue bg-accent-blue/10" : "border-white/10 bg-bg-primary hover:border-white/20"
        } ${uploading ? "cursor-wait opacity-90" : "cursor-pointer"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {preview ? (
            <Image
              src={preview}
              alt={`${label} preview`}
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 rounded-xl border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-white/20 text-center text-xs text-text-muted">
              Drop image
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold text-white">{preview ? "Replace image" : "Upload image"}</p>
            <p className="text-xs text-text-muted">Drag and drop or use the button to choose a JPG, PNG, or WEBP file.</p>
            <p className="text-xs text-text-muted">Max size: {maxUploadSizeLabel}</p>
            <div className="flex flex-wrap gap-2">
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
              {persistedUrl ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleCopyUrl();
                  }}
                  disabled={uploading}
                  className="btn-secondary !text-[11px] disabled:opacity-60"
                >
                  Copy URL
                </button>
              ) : null}
              {preview ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClearImage();
                  }}
                  disabled={uploading}
                  className="btn-watch-live !text-[11px] disabled:opacity-60"
                >
                  Delete image
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              role="progressbar"
              aria-label={`${label} upload progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-full rounded-full bg-accent-blue transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">Uploading to Cloudflare R2... {progress}%</p>
        </div>
      )}

      {notice && (
        <p role="status" aria-live="polite" className="text-xs text-green-300">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" aria-live="assertive" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
