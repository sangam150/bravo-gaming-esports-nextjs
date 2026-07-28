import sharp from "sharp";

const CONTENT_TYPE_BY_FORMAT = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

const EXTENSION_BY_FORMAT = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
} as const;

type SupportedImageFormat = keyof typeof CONTENT_TYPE_BY_FORMAT;

export type DecodedImageMetadata = {
  contentType: (typeof CONTENT_TYPE_BY_FORMAT)[SupportedImageFormat];
  extension: (typeof EXTENSION_BY_FORMAT)[SupportedImageFormat];
  format: SupportedImageFormat;
  height: number;
  sizeBytes: number;
  width: number;
};

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

export async function decodeApprovedImage(
  buffer: Buffer,
  options: {
    declaredContentType?: string | null;
    fileName?: string;
    maxPixels?: number;
  } = {},
): Promise<DecodedImageMetadata> {
  const maxPixels = options.maxPixels ?? 40_000_000;

  let metadata: {
    format?: string;
    height?: number;
    width?: number;
  };
  try {
    const decoder = sharp(buffer, {
      failOn: "error",
      limitInputPixels: maxPixels,
    });
    [metadata] = await Promise.all([
      decoder.metadata(),
      // Force a complete pixel decode so truncated/polyglot files cannot pass
      // based only on a valid-looking header.
      decoder.clone().stats(),
    ]);
  } catch {
    throw new ImageDecodeError("The selected file is not a valid PNG, JPG, JPEG, or WEBP image.");
  }

  const format = metadata.format;
  if (!format || !(format in CONTENT_TYPE_BY_FORMAT)) {
    throw new ImageDecodeError("The selected file is not a valid PNG, JPG, JPEG, or WEBP image.");
  }

  const supportedFormat = format as SupportedImageFormat;
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < 1 || height < 1 || width * height > maxPixels) {
    throw new ImageDecodeError("The selected image dimensions are invalid or too large.");
  }

  const contentType = CONTENT_TYPE_BY_FORMAT[supportedFormat];
  const declaredContentType = options.declaredContentType?.trim().toLowerCase();
  if (declaredContentType && declaredContentType !== contentType) {
    throw new ImageDecodeError("The file contents do not match the reported image type.");
  }
  const suppliedExtension =
    options.fileName
      ?.trim()
      .toLowerCase()
      .match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const allowedExtensions = supportedFormat === "jpeg" ? new Set(["jpeg", "jpg"]) : new Set([EXTENSION_BY_FORMAT[supportedFormat]]);
  if (suppliedExtension && !allowedExtensions.has(suppliedExtension)) {
    throw new ImageDecodeError("The file extension does not match the image contents.");
  }

  return {
    contentType,
    extension: EXTENSION_BY_FORMAT[supportedFormat],
    format: supportedFormat,
    height,
    sizeBytes: buffer.byteLength,
    width,
  };
}
