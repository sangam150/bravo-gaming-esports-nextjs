import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_MOSS_CONTENT_TYPES,
  ALLOWED_MOSS_EXTENSIONS,
  formatUploadSize,
  getUploadMaxBytes,
  isImageUploadType,
  isPrivateUploadType,
  isTeamLogoUploadType,
  normalizeUploadType,
  TEAM_LOGO_CONTENT_TYPES,
  TEAM_LOGO_EXTENSIONS,
  type UploadType,
} from "./upload-config";

const CONTENT_TYPE_BY_EXTENSION = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".rar": "application/x-rar-compressed",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".zip": "application/zip",
  ".7z": "application/x-7z-compressed",
} as const;

type UploadValidationAudience = "admin" | "team";

type UploadValidationInput = {
  audience?: UploadValidationAudience;
  contentType: string | null | undefined;
  fileName: string;
  size: number;
  type: string | null | undefined;
};

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf(".");
  if (lastDotIndex < 0) return "";
  return normalized.slice(lastDotIndex);
}

function getMaxUploadBytes(type: UploadType) {
  return getUploadMaxBytes(type);
}

function getAllowedExtensions(type: UploadType) {
  if (isTeamLogoUploadType(type)) {
    return TEAM_LOGO_EXTENSIONS;
  }

  return isImageUploadType(type) ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_MOSS_EXTENSIONS;
}

function getAllowedContentTypes(type: UploadType) {
  if (isTeamLogoUploadType(type)) {
    return TEAM_LOGO_CONTENT_TYPES;
  }

  return isImageUploadType(type) ? ALLOWED_IMAGE_CONTENT_TYPES : ALLOWED_MOSS_CONTENT_TYPES;
}

function isAllowedUploadExtension(type: UploadType, fileName: string, audience: UploadValidationAudience) {
  const extension = getFileExtension(fileName);
  void audience;
  return (getAllowedExtensions(type) as readonly string[]).includes(extension);
}

function isAllowedUploadContentType(type: UploadType, contentType: string | null | undefined, audience: UploadValidationAudience) {
  const normalizedContentType = contentType?.trim().toLowerCase();
  if (!normalizedContentType) {
    return false;
  }

  void audience;
  return (getAllowedContentTypes(type) as readonly string[]).includes(normalizedContentType);
}

function getUploadValidationMessage(type: UploadType) {
  if (isImageUploadType(type)) {
    return "Upload a PNG, JPG, JPEG, or WEBP image.";
  }

  return isPrivateUploadType(type) ? "Upload a ZIP, RAR, 7Z, PDF, or TXT file." : "Upload a PNG, JPG, JPEG, or WEBP image.";
}

export function resolveUploadContentType(
  type: UploadType,
  fileName: string,
  contentType: string | null | undefined,
  options: { audience?: UploadValidationAudience } = {},
) {
  const audience = options.audience ?? "admin";
  const normalizedContentType = contentType?.trim().toLowerCase();
  const extension = getFileExtension(fileName);
  const extensionContentType = CONTENT_TYPE_BY_EXTENSION[extension as keyof typeof CONTENT_TYPE_BY_EXTENSION] ?? null;

  if (
    normalizedContentType &&
    isAllowedUploadContentType(type, normalizedContentType, audience) &&
    isAllowedUploadExtension(type, fileName, audience)
  ) {
    return normalizedContentType;
  }

  if (extensionContentType && isAllowedUploadExtension(type, fileName, audience)) {
    return extensionContentType;
  }

  return null;
}

export function validateUpload(input: UploadValidationInput) {
  const audience = input.audience ?? "admin";
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

  if (!isAllowedUploadExtension(normalizedType, input.fileName, audience)) {
    return getUploadValidationMessage(normalizedType);
  }

  if (!isAllowedUploadContentType(normalizedType, input.contentType, audience)) {
    return getUploadValidationMessage(normalizedType);
  }

  return null;
}

export function validateImageUpload(input: Omit<UploadValidationInput, "audience">) {
  return validateUpload({ ...input, audience: "admin" });
}
