"use client";

import { getClientAuth } from "./firebase-client";
import type { UploadType } from "./upload-config";

export async function getIdToken(): Promise<string | null> {
  const auth = getClientAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
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
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

type UploadProgressCallback = (progress: number) => void;

export type AdminUploadResponse = {
  success: true;
  id: string;
  path: string;
  url: string;
};

async function sendUploadRequest(
  url: string,
  formData: FormData,
  headers: Headers,
  onProgress?: UploadProgressCallback
) {
  return new Promise<AdminUploadResponse>((resolve, reject) => {
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
        resolve(data as AdminUploadResponse);
        return;
      }

      reject(new Error(data.error || "Upload failed"));
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload canceled"));
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
  } = {}
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

  return sendUploadRequest("/api/admin/upload", formData, headers, options.onProgress);
}
