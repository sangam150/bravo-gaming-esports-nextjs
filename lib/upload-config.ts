import type { ManagedUploadFolder, StorageTarget } from "./r2/types";

export const STORAGE_TARGET_BY_TYPE = {
  announcement_image: { folder: "news", visibility: "public" },
  coach_avatar: { folder: "players", visibility: "public" },
  evidence_file: { folder: "evidence", visibility: "private" },
  hero_slide_asset: { folder: "hero", visibility: "public" },
  investigation_file: { folder: "evidence", visibility: "private" },
  match_media: { folder: "media", visibility: "public" },
  match_screenshot: { folder: "media", visibility: "public" },
  media_asset: { folder: "media", visibility: "public" },
  moss_file: { folder: "moss", visibility: "private" },
  player_avatar: { folder: "players", visibility: "public" },
  player_photo: { folder: "players", visibility: "public" },
  report_attachment: { folder: "evidence", visibility: "private" },
  result_screenshot: { folder: "media", visibility: "public" },
  scoreboard_image: { folder: "media", visibility: "public" },
  sponsor_asset: { folder: "sponsors", visibility: "public" },
  sponsor_logo: { folder: "sponsors", visibility: "public" },
  stream_thumbnail: { folder: "media", visibility: "public" },
  team_logo: { folder: "teams", visibility: "public" },
  team_logo_pending: { folder: "teams", visibility: "private" },
  tournament_banner: { folder: "events", visibility: "public" },
} as const satisfies Record<string, StorageTarget>;

export type UploadType = keyof typeof STORAGE_TARGET_BY_TYPE;
export type UploadFolder = ManagedUploadFolder;

const SMALL_PUBLIC_IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const LARGE_PUBLIC_IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const MOSS_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const TEAM_LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const TEAM_LOGO_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;

export const ALLOWED_MOSS_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/pdf",
  "text/plain",
] as const;

export const ALLOWED_MOSS_EXTENSIONS = [".zip", ".rar", ".7z", ".pdf", ".txt"] as const;

export const IMAGE_FILE_INPUT_ACCEPT = ALLOWED_IMAGE_EXTENSIONS.join(",");
export const TEAM_LOGO_FILE_INPUT_ACCEPT = TEAM_LOGO_EXTENSIONS.join(",");
export const MOSS_FILE_INPUT_ACCEPT = ALLOWED_MOSS_EXTENSIONS.join(",");

const SMALL_PUBLIC_IMAGE_UPLOAD_TYPES = new Set<UploadType>([
  "coach_avatar",
  "player_avatar",
  "player_photo",
  "sponsor_logo",
  "team_logo",
  "team_logo_pending",
]);

const PRIVATE_FILE_UPLOAD_TYPES = new Set<UploadType>(["evidence_file", "investigation_file", "moss_file", "report_attachment"]);

const IMAGE_UPLOAD_TYPES = new Set<UploadType>(
  Object.keys(STORAGE_TARGET_BY_TYPE).filter(
    (value): value is UploadType => value in STORAGE_TARGET_BY_TYPE && !PRIVATE_FILE_UPLOAD_TYPES.has(value as UploadType),
  ),
);

function isUploadType(value: string): value is UploadType {
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
  const normalizedFileName = fileName.trim();
  const lastDotIndex = normalizedFileName.toLowerCase().lastIndexOf(".");
  const extension = lastDotIndex >= 0 ? normalizedFileName.slice(lastDotIndex).toLowerCase() : "";
  const baseName = extension ? normalizedFileName.slice(0, -extension.length) : normalizedFileName;
  const allowedExtensions = (PRIVATE_FILE_UPLOAD_TYPES.has(type) ? ALLOWED_MOSS_EXTENSIONS : ALLOWED_IMAGE_EXTENSIONS) as readonly string[];
  const safeExtension = allowedExtensions.includes(extension) ? extension : "";
  const safeBaseName = baseName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

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

export function getUploadFolder(type: UploadType) {
  return STORAGE_TARGET_BY_TYPE[type].folder;
}

export function getUploadVisibility(type: UploadType) {
  return STORAGE_TARGET_BY_TYPE[type].visibility;
}

export function isPrivateUploadType(type: UploadType) {
  return STORAGE_TARGET_BY_TYPE[type].visibility === "private";
}

export function isImageUploadType(type: UploadType) {
  return IMAGE_UPLOAD_TYPES.has(type);
}

export function isTeamLogoUploadType(type: UploadType) {
  return type === "team_logo" || type === "team_logo_pending";
}

export function getUploadMaxBytes(type: UploadType) {
  if (PRIVATE_FILE_UPLOAD_TYPES.has(type)) {
    return MOSS_UPLOAD_MAX_BYTES;
  }

  return SMALL_PUBLIC_IMAGE_UPLOAD_TYPES.has(type) ? SMALL_PUBLIC_IMAGE_UPLOAD_MAX_BYTES : LARGE_PUBLIC_IMAGE_UPLOAD_MAX_BYTES;
}

function isUploadFolder(value: string): value is UploadFolder {
  return (Object.values(STORAGE_TARGET_BY_TYPE) as StorageTarget[]).some((target) => target.folder === value);
}

export function normalizeUploadFolder(value: string | null | undefined): UploadFolder | null {
  if (!value) return null;
  return isUploadFolder(value) ? value : null;
}
