"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import type { UploadType } from "./upload-config";
import { getResponseErrorMessage, USER_FACING_ERROR_MESSAGES } from "./user-facing-errors";

async function getIdToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function adminFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = await getIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      getResponseErrorMessage(res, data.error, {
        fallback: USER_FACING_ERROR_MESSAGES.admin,
      }),
    );
  }
  return data;
}

type UploadProgressCallback = (progress: number) => void;

export type AdminUploadResponse = {
  success: true;
  id: string;
  path: string;
  url: string;
};

export type AdminTeamLogoUploadResponse = AdminUploadResponse & {
  cleanupPending: boolean;
  key: string;
  team: {
    id: string;
    logoUrl: string | null;
    name: string;
    slug: string | null;
    updatedAt: string;
  };
};

async function sendUploadRequest<TResponse extends AdminUploadResponse>(
  url: string,
  formData: FormData,
  headers: Headers,
  onProgress?: UploadProgressCallback,
) {
  return new Promise<TResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;

    headers.forEach((value, key) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let data: Partial<AdminUploadResponse> & { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as Partial<AdminUploadResponse> & { error?: string };
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.url && data.id && data.path) {
        onProgress?.(100);
        resolve(data as TResponse);
        return;
      }

      reject(
        new Error(
          getResponseErrorMessage(new Response(null, { status: xhr.status || 500 }), data.error, {
            fallback: "We couldn't upload that file right now. Please try again shortly.",
          }),
        ),
      );
    };

    xhr.onerror = () => reject(new Error(USER_FACING_ERROR_MESSAGES.network));
    xhr.onabort = () => reject(new Error("The upload was canceled before it finished."));
    xhr.send(formData);
  });
}

export async function adminUpload(
  file: File,
  type: UploadType,
  entityId: string,
  options: {
    onProgress?: UploadProgressCallback;
    previousUrl?: string;
  } = {},
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  formData.append("entityId", entityId);
  if (options.previousUrl) {
    formData.append("previousUrl", options.previousUrl);
  }

  const headers = new Headers();
  const token = await getIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return sendUploadRequest<AdminUploadResponse>("/api/admin/uploads/r2", formData, headers, options.onProgress);
}

export async function adminUploadTeamLogo(
  file: File,
  teamId: string,
  options: {
    onProgress?: UploadProgressCallback;
  } = {},
) {
  const formData = new FormData();
  formData.append("file", file);
  const headers = new Headers();
  const token = await getIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return sendUploadRequest<AdminTeamLogoUploadResponse>(
    `/api/admin/teams/${encodeURIComponent(teamId)}/logo`,
    formData,
    headers,
    options.onProgress,
  );
}
