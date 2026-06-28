export type StorageVisibility = "public" | "private";

export type ManagedUploadFolder =
  | "teams"
  | "players"
  | "sponsors"
  | "events"
  | "news"
  | "media"
  | "hero"
  | "moss"
  | "evidence";

export type StorageTarget = {
  folder: ManagedUploadFolder;
  visibility: StorageVisibility;
};

export type BuildStoragePathResult = {
  bucket: string;
  folder: ManagedUploadFolder;
  path: string;
  visibility: StorageVisibility;
};

export type PresignedUploadResult = {
  expiresAt: string;
  headers: Record<string, string>;
  method: "PUT";
  path: string;
  uploadUrl: string;
  url: string;
};

export type ManagedUploadRecord = {
  contentType: string | null;
  fileName: string | null;
  filePath: string | null;
  fileType: string;
  id: string;
  relatedId: string | null;
  relatedType: string;
  sizeBytes: number | null;
  url: string;
};
