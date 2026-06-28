"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatUploadSize,
  getUploadMaxBytes,
  IMAGE_FILE_INPUT_ACCEPT,
} from "@/lib/upload-config";
import { validateUpload } from "@/lib/upload-validation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  getResponseErrorMessage,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

type PlayerAvatarUploadResponse = {
  id: string;
  path: string;
  success: true;
  url: string;
};

async function getAccessToken() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export default function PlayerAvatarUploadCard({
  currentAvatarUrl,
  playerName,
  teamName,
}: {
  currentAvatarUrl?: string | null;
  playerName: string;
  teamName?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? null);
  const [preview, setPreview] = useState(currentAvatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const maxUploadSizeLabel = formatUploadSize(getUploadMaxBytes("player_avatar"));

  useEffect(() => {
    setAvatarUrl(currentAvatarUrl ?? null);
    setPreview(currentAvatarUrl ?? null);
  }, [currentAvatarUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function clearPreviewObjectUrl() {
    if (!previewUrlRef.current) return;
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }

  async function handleFile(file: File) {
    const validationError = validateUpload({
      audience: "admin",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type: "player_avatar",
    });

    if (validationError) {
      setError(validationError);
      setNotice(null);
      return;
    }

    setUploading(true);
    setError(null);
    setNotice("Uploading avatar...");

    clearPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPreview(objectUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const headers = new Headers();
      const token = await getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch("/api/player/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });
      const data = (await response.json().catch(() => ({}))) as Partial<PlayerAvatarUploadResponse> & {
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(
          getResponseErrorMessage(response, data.error, {
            fallback: USER_FACING_ERROR_MESSAGES.playerProfile,
          })
        );
      }

      clearPreviewObjectUrl();
      setAvatarUrl(data.url);
      setPreview(data.url);
      setNotice("Avatar updated. Public player cards will refresh shortly.");
      router.refresh();
    } catch (uploadError: unknown) {
      clearPreviewObjectUrl();
      setPreview(avatarUrl ?? null);
      setError(
        toUserFacingErrorMessage(uploadError, {
          fallback: USER_FACING_ERROR_MESSAGES.playerProfile,
        })
      );
      setNotice(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-card border border-white/[0.08] bg-bg-primary/80 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {preview ? (
          <img
            src={preview}
            alt={`${playerName} avatar`}
            className="h-24 w-24 rounded-3xl border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/20 text-xs uppercase tracking-[0.14em] text-text-muted">
            No Avatar
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="section-title">Profile Image</p>
          <h2 className="font-display text-2xl font-black uppercase text-white">{playerName}</h2>
          <p className="text-sm text-text-muted">
            {teamName ? `${teamName} player profile` : "Published player profile"}.
          </p>
          <p className="text-xs text-text-muted">
            JPG, PNG, and WEBP only. Max size: {maxUploadSizeLabel}.
          </p>
        </div>
      </div>

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

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-primary disabled:opacity-60"
        >
          {uploading ? "Uploading Avatar..." : avatarUrl ? "Replace Avatar" : "Upload Avatar"}
        </button>
      </div>

      {notice ? <p className="mt-4 text-sm text-green-300">{notice}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
