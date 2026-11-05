"use client";

import type { UploadType } from "./upload-config";
import { getResponseErrorMessage, USER_FACING_ERROR_MESSAGES } from "./user-facing-errors";

export async function adminFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // SSR cookies are authoritative after server-side password login. A cached
  // SDK bearer can belong to the previous account and override those cookies.
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

type AdminUploadResponse = {
  success: true;
  id: string;
  path: string;
  url: string;
};

type AdminTeamLogoUploadResponse = AdminUploadResponse & {
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

type AdminPlayerAvatarUploadResponse = AdminUploadResponse & {
  cleanupPending: boolean;
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
  return sendUploadRequest<AdminTeamLogoUploadResponse>(
    `/api/admin/teams/${encodeURIComponent(teamId)}/logo`,
    formData,
    headers,
    options.onProgress,
  );
}

export async function adminUploadPlayerAvatar(
  file: File,
  playerId: string,
  options: {
    onProgress?: UploadProgressCallback;
  } = {},
) {
  const formData = new FormData();
  formData.append("file", file);
  const headers = new Headers();
  return sendUploadRequest<AdminPlayerAvatarUploadResponse>(
    `/api/admin/players/${encodeURIComponent(playerId)}/avatar`,
    formData,
    headers,
    options.onProgress,
  );
}

export async function adminDeleteTeamLogo(teamId: string) {
  return (await adminFetch(`/api/admin/teams/${encodeURIComponent(teamId)}/logo`, {
    method: "DELETE",
  })) as { cleanupPending: boolean; success: true; url: null };
}

export async function adminDeletePlayerAvatar(playerId: string) {
  return (await adminFetch(`/api/admin/players/${encodeURIComponent(playerId)}/avatar`, {
    method: "DELETE",
  })) as { cleanupPending: boolean; success: true; url: null };
}

export async function adminDeleteStagedUpload(input: { objectKey: string; uploadId: string }, options: { keepalive?: boolean } = {}) {
  return (await adminFetch("/api/admin/uploads/r2", {
    body: JSON.stringify(input),
    keepalive: options.keepalive,
    method: "DELETE",
  })) as {
    deleted: boolean;
    referenced: boolean;
    success: true;
  };
}

export async function adminAdoptTeamLogo(teamId: string, input: { objectKey: string; uploadId: string }) {
  return (await adminFetch(`/api/admin/teams/${encodeURIComponent(teamId)}/logo/adopt`, {
    body: JSON.stringify(input),
    method: "POST",
  })) as AdminTeamLogoUploadResponse & { sourceCleanupPending: boolean };
}
