import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

type R2Environment = {
  accountId: string;
  accessKeyId: string;
  publicDeliveryMode: "direct" | "proxy";
  endpoint: string;
  privateBucketName: string;
  publicBaseUrl: string;
  publicBucketName: string;
  secretAccessKey: string;
};

let cachedClient: S3Client | null = null;
let cachedClientSignature: string | null = null;

function getRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Cloudflare R2 environment variable: ${name}`);
  }

  return value;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/g, "");
}

function resolveR2PublicDeliveryMode() {
  const configuredMode = process.env.R2_PUBLIC_DELIVERY_MODE?.trim().toLowerCase();
  if (!configuredMode || configuredMode === "proxy") return "proxy";
  if (configuredMode === "direct") return "direct";
  throw new Error("R2_PUBLIC_DELIVERY_MODE must be either proxy or direct.");
}

function normalizePublicBaseUrl(value: string, variableName: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid HTTPS URL.`);
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${variableName} must be a credential-free HTTPS URL without a query string or fragment.`);
  }

  return trimTrailingSlash(parsed.toString());
}

function getR2Environment(): R2Environment {
  const accountId = getRequiredEnvironmentValue("R2_ACCOUNT_ID");
  const endpoint = trimTrailingSlash(process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`);
  const privateBucketName = getRequiredEnvironmentValue("R2_PRIVATE_BUCKET_NAME");
  const publicBucketName = getRequiredEnvironmentValue("R2_BUCKET_NAME");
  if (privateBucketName === publicBucketName) {
    throw new Error("Cloudflare R2 public and private storage must use separate buckets.");
  }

  const publicDeliveryMode = resolveR2PublicDeliveryMode();
  const publicBaseUrl = normalizePublicBaseUrl(getRequiredEnvironmentValue("R2_PUBLIC_BASE_URL"), "R2_PUBLIC_BASE_URL");
  if (publicDeliveryMode === "direct") {
    const clientPublicBaseUrl = normalizePublicBaseUrl(
      getRequiredEnvironmentValue("NEXT_PUBLIC_R2_PUBLIC_BASE_URL"),
      "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
    );
    if (clientPublicBaseUrl !== publicBaseUrl) {
      throw new Error("NEXT_PUBLIC_R2_PUBLIC_BASE_URL must exactly match R2_PUBLIC_BASE_URL when direct delivery is enabled.");
    }
  }

  return {
    accountId,
    accessKeyId: getRequiredEnvironmentValue("R2_ACCESS_KEY_ID"),
    endpoint,
    privateBucketName,
    publicDeliveryMode,
    publicBaseUrl,
    publicBucketName,
    secretAccessKey: getRequiredEnvironmentValue("R2_SECRET_ACCESS_KEY"),
  };
}

export function getR2Client() {
  const env = getR2Environment();
  const signature = `${env.accountId}:${env.endpoint}:${env.accessKeyId}:${env.publicBucketName}:${env.privateBucketName}`;

  if (!cachedClient || cachedClientSignature !== signature) {
    cachedClient = new S3Client({
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
      endpoint: env.endpoint,
      region: "auto",
    });
    cachedClientSignature = signature;
  }

  return cachedClient;
}

export function getR2PublicBucketName() {
  return getR2Environment().publicBucketName;
}

export function getR2PrivateBucketName() {
  return getR2Environment().privateBucketName;
}

export function getR2PublicBaseUrl() {
  return getR2Environment().publicBaseUrl;
}

export function getR2PublicDeliveryMode() {
  return getR2Environment().publicDeliveryMode;
}
