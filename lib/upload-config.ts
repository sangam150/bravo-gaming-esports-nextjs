export const STORAGE_TARGET_BY_TYPE = {
  team_logo: { bucket: "team-logos", directory: "logos" },
  player_avatar: { bucket: "player-avatars", directory: "avatars" },
  tournament_banner: { bucket: "event-banners", directory: "banners" },
  match_screenshot: { bucket: "result-screenshots", directory: "results" },
  stream_thumbnail: { bucket: "stream-assets", directory: "thumbnails" },
  sponsor_asset: { bucket: "sponsor-logos", directory: "sponsors" },
  announcement_image: { bucket: "stream-assets", directory: "announcements" },
  moss_file: { bucket: "moss-files", directory: "submissions" },
} as const;

export type UploadType = keyof typeof STORAGE_TARGET_BY_TYPE;

export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const MOSS_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
] as const;

export const ALLOWED_MOSS_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/pdf",
  "text/plain",
] as const;

export const ALLOWED_MOSS_EXTENSIONS = [
  ".zip",
  ".rar",
  ".7z",
  ".pdf",
  ".txt",
] as const;

const CONTENT_TYPE_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
} as const;

const MOSS_UPLOAD_TYPES = new Set<UploadType>(["moss_file"]);

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf(".");
  if (lastDotIndex < 0) return "";
  return normalized.slice(lastDotIndex);
}

function getAllowedExtensions(type: UploadType) {
  return MOSS_UPLOAD_TYPES.has(type) ? ALLOWED_MOSS_EXTENSIONS : ALLOWED_IMAGE_EXTENSIONS;
}

function getAllowedContentTypes(type: UploadType) {
  return MOSS_UPLOAD_TYPES.has(type) ? ALLOWED_MOSS_CONTENT_TYPES : ALLOWED_IMAGE_CONTENT_TYPES;
}

function getMaxUploadBytes(type: UploadType) {
  return MOSS_UPLOAD_TYPES.has(type) ? MOSS_UPLOAD_MAX_BYTES : IMAGE_UPLOAD_MAX_BYTES;
}

export const IMAGE_FILE_INPUT_ACCEPT = ALLOWED_IMAGE_EXTENSIONS.join(",");
export const MOSS_FILE_INPUT_ACCEPT = ALLOWED_MOSS_EXTENSIONS.join(",");

export function isUploadType(value: string): value is UploadType {
  return value in STORAGE_TARGET_BY_TYPE;
}

export function normalizeUploadType(value: string | null | undefined): UploadType | null {
  if (!value) return null;
  return isUploadType(value) ? value : null;
}

export function sanitizeStorageSegment(value: string) {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "general";
}

export function sanitizeUploadFileName(type: UploadType, fileName: string) {
  const extension = getFileExtension(fileName);
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  const allowedExtensions = getAllowedExtensions(type) as readonly string[];
  const safeBaseName = baseName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeExtension = allowedExtensions.includes(extension) ? extension : "";

  return `${safeBaseName || "upload"}${safeExtension}`;
}

export function formatUploadSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

export function resolveUploadContentType(
  type: UploadType,
  fileName: string,
  contentType: string | null | undefined
) {
  const normalizedContentType = contentType?.trim().toLowerCase();
  const allowedContentTypes = getAllowedContentTypes(type) as readonly string[];

  if (normalizedContentType && allowedContentTypes.includes(normalizedContentType)) {
    return normalizedContentType;
  }

  const extension = getFileExtension(fileName);
  return CONTENT_TYPE_BY_EXTENSION[extension as keyof typeof CONTENT_TYPE_BY_EXTENSION] ?? null;
}

export function resolveImageContentType(fileName: string, contentType: string | null | undefined) {
  return resolveUploadContentType("team_logo", fileName, contentType);
}

export function validateUpload(input: {
  type: string | null | undefined;
  fileName: string;
  contentType: string | null | undefined;
  size: number;
}) {
  const normalizedType = normalizeUploadType(input.type);

  if (!normalizedType) {
    return "Unsupported upload type.";
  }

  if (!input.fileName.trim()) {
    return "A file name is required.";
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return "The selected file is empty.";
  }

  const maxBytes = getMaxUploadBytes(normalizedType);
  if (input.size > maxBytes) {
    return `Files must be ${formatUploadSize(maxBytes)} or smaller.`;
  }

  if (!resolveUploadContentType(normalizedType, input.fileName, input.contentType)) {
    return normalizedType === "moss_file"
      ? "Upload a ZIP, RAR, 7Z, PDF, or TXT file."
      : "Upload a JPG, PNG, WEBP, GIF, or AVIF image.";
  }

  return null;
}

export function validateImageUpload(input: {
  type: string | null | undefined;
  fileName: string;
  contentType: string | null | undefined;
  size: number;
}) {
  return validateUpload(input);
}
