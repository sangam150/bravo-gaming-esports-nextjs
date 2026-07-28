import "server-only";

import { createHash } from "node:crypto";
import { decodeApprovedImage, type DecodedImageMetadata } from "./image-validation";
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

export type PreparedCanonicalImage = {
  decoded: DecodedImageMetadata;
  metadata: CanonicalImageCoreMetadata;
};

export type PreparedCanonicalPublicImage = {
  decoded: DecodedImageMetadata;
  metadata: CanonicalImageAssetMetadata;
  objectKey: string;
  publicUrl: string;
};

function normalizeAssetName(value: string) {
  return sanitizeStorageSegment(value).replace(/_/g, "-").toLowerCase();
}

export async function prepareCanonicalImage(input: {
  altText?: string;
  buffer: Buffer;
  declaredContentType?: string | null;
  fileName: string;
  now?: Date;
}): Promise<PreparedCanonicalImage> {
  const decoded = await decodeApprovedImage(input.buffer, {
    declaredContentType: input.declaredContentType,
    fileName: input.fileName,
  });
  const contentHash = createHash("sha256").update(input.buffer).digest("hex");
  const timestamp = (input.now ?? new Date()).getTime();

  return {
    decoded,
    metadata: {
      altText: input.altText?.trim() || null,
      contentHash,
      height: decoded.height,
      mimeType: decoded.contentType,
      sizeBytes: decoded.sizeBytes,
      updatedAt: new Date(timestamp).toISOString(),
      version: `${timestamp}-${contentHash.slice(0, 12)}`,
      width: decoded.width,
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
  });
  const entityId = sanitizeStorageSegment(input.entityId);
  const assetName = normalizeAssetName(input.assetName ?? input.type);
  const objectKey = `${getUploadFolder(input.type)}/${entityId}/${assetName}-${preparedImage.metadata.version}.${preparedImage.decoded.extension}`;
  const publicUrl = buildPublicFileUrl(objectKey);

  return {
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
