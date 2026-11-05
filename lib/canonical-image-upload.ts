import "server-only";

import { createHash } from "node:crypto";
import { canonicalizeApprovedImage, type DecodedImageMetadata } from "./image-validation";
import { buildPublicFileUrl } from "./r2/storage";
import { getUploadFolder, getUploadVisibility, isImageUploadType, sanitizeStorageSegment, type UploadType } from "./upload-config";

export type CanonicalImageAssetMetadata = {
  altText: string | null;
  contentHash: string;
  height: number;
  mimeType: DecodedImageMetadata["contentType"];
  objectKey: string;
  publicUrl: string;
  sizeBytes: number;
  status: "active";
  updatedAt: string;
  version: string;
  width: number;
};

type CanonicalImageCoreMetadata = Omit<CanonicalImageAssetMetadata, "objectKey" | "publicUrl" | "status">;

type PreparedCanonicalImage = {
  buffer: Buffer;
  decoded: DecodedImageMetadata;
  metadata: CanonicalImageCoreMetadata;
};

type PreparedCanonicalPublicImage = {
  buffer: Buffer;
  decoded: DecodedImageMetadata;
  metadata: CanonicalImageAssetMetadata;
  objectKey: string;
  publicUrl: string;
};

function normalizeAssetName(value: string) {
  return sanitizeStorageSegment(value).replace(/_/g, "-").toLowerCase();
}

const SMALL_SQUARE_IMAGE_TYPES = new Set<UploadType>([
  "coach_avatar",
  "player_avatar",
  "player_photo",
  "sponsor_logo",
  "team_logo",
  "team_logo_pending",
]);

export async function prepareCanonicalImage(input: {
  altText?: string;
  buffer: Buffer;
  declaredContentType?: string | null;
  fileName: string;
  now?: Date;
  type?: UploadType;
}): Promise<PreparedCanonicalImage> {
  const canonicalImage = await canonicalizeApprovedImage(input.buffer, {
    declaredContentType: input.declaredContentType,
    fileName: input.fileName,
    maxDimension: input.type && SMALL_SQUARE_IMAGE_TYPES.has(input.type) ? 1024 : 2560,
    quality: input.type && SMALL_SQUARE_IMAGE_TYPES.has(input.type) ? 90 : 86,
  });
  const contentHash = createHash("sha256").update(canonicalImage.buffer).digest("hex");
  const timestamp = (input.now ?? new Date()).getTime();

  return {
    buffer: canonicalImage.buffer,
    decoded: canonicalImage.metadata,
    metadata: {
      altText: input.altText?.trim() || null,
      contentHash,
      height: canonicalImage.metadata.height,
      mimeType: canonicalImage.metadata.contentType,
      sizeBytes: canonicalImage.metadata.sizeBytes,
      updatedAt: new Date(timestamp).toISOString(),
      version: `${timestamp}-${contentHash.slice(0, 12)}`,
      width: canonicalImage.metadata.width,
    },
  };
}

export async function prepareCanonicalPublicImageUpload(input: {
  altText?: string;
  assetName?: string;
  buffer: Buffer;
  declaredContentType?: string | null;
  entityId: string;
  fileName: string;
  now?: Date;
  type: UploadType;
}): Promise<PreparedCanonicalPublicImage> {
  if (!isImageUploadType(input.type) || getUploadVisibility(input.type) !== "public") {
    throw new Error("The selected upload type is not a public image asset.");
  }

  const preparedImage = await prepareCanonicalImage({
    altText: input.altText,
    buffer: input.buffer,
    declaredContentType: input.declaredContentType,
    fileName: input.fileName,
    now: input.now,
    type: input.type,
  });
  const entityId = sanitizeStorageSegment(input.entityId);
  const assetName = normalizeAssetName(input.assetName ?? input.type);
  const objectKey = `${getUploadFolder(input.type)}/${entityId}/${assetName}-${preparedImage.metadata.version}.${preparedImage.decoded.extension}`;
  const publicUrl = buildPublicFileUrl(objectKey);

  return {
    buffer: preparedImage.buffer,
    decoded: preparedImage.decoded,
    metadata: {
      ...preparedImage.metadata,
      objectKey,
      publicUrl,
      status: "active",
    },
    objectKey,
    publicUrl,
  };
}
