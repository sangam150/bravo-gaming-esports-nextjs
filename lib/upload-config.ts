export const STORAGE_DIRECTORY_BY_TYPE = {
  team_logo: "team-logos",
  player_avatar: "player-images",
  tournament_banner: "tournament-banners",
  match_screenshot: "match-screenshots",
  stream_thumbnail: "stream-thumbnails",
  sponsor_asset: "sponsors",
  announcement_image: "announcements",
} as const;

export type UploadType = keyof typeof STORAGE_DIRECTORY_BY_TYPE;

export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

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

export const IMAGE_FILE_INPUT_ACCEPT = ALLOWED_IMAGE_EXTENSIONS.join(",");

const CONTENT_TYPE_BY_EXTENSION: Record<(typeof ALLOWED_IMAGE_EXTENSIONS)[number], (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf(".");
  if (lastDotIndex < 0) return "";
  return normalized.slice(lastDotIndex);
}

export function isUploadType(value: string): value is UploadType {
  return value in STORAGE_DIRECTORY_BY_TYPE;
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

export function sanitizeUploadFileName(fileName: string) {
  const extension = getFileExtension(fileName);
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  const safeBaseName = baseName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeExtension = ALLOWED_IMAGE_EXTENSIONS.includes(extension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])
    ? extension
    : "";

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

export function resolveImageContentType(fileName: string, contentType: string | null | undefined) {
  const normalizedContentType = contentType?.trim().toLowerCase();
  if (
    normalizedContentType &&
    ALLOWED_IMAGE_CONTENT_TYPES.includes(
      normalizedContentType as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]
    )
  ) {
    return normalizedContentType;
  }

  const extension = getFileExtension(fileName);
  return CONTENT_TYPE_BY_EXTENSION[extension as keyof typeof CONTENT_TYPE_BY_EXTENSION] ?? null;
}

export function validateImageUpload(input: {
  type: string | null | undefined;
  fileName: string;
  contentType: string | null | undefined;
  size: number;
}) {
  if (!normalizeUploadType(input.type)) {
    return "Unsupported upload type.";
  }

  if (!input.fileName.trim()) {
    return "A file name is required.";
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return "The selected file is empty.";
  }

  if (input.size > IMAGE_UPLOAD_MAX_BYTES) {
    return `Images must be ${formatUploadSize(IMAGE_UPLOAD_MAX_BYTES)} or smaller.`;
  }

  if (!resolveImageContentType(input.fileName, input.contentType)) {
    return "Upload a JPG, PNG, WEBP, GIF, or AVIF image.";
  }

  return null;
}
