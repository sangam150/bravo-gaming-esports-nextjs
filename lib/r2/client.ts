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
  return process.env.R2_PUBLIC_DELIVERY_MODE?.trim().toLowerCase() === "proxy" ? "proxy" : "direct";
}

export function getR2Environment(): R2Environment {
  const accountId = getRequiredEnvironmentValue("R2_ACCOUNT_ID");
  const endpoint = trimTrailingSlash(
    process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`
  );

  return {
    accountId,
    accessKeyId: getRequiredEnvironmentValue("R2_ACCESS_KEY_ID"),
    endpoint,
    privateBucketName: getRequiredEnvironmentValue("R2_PRIVATE_BUCKET_NAME"),
    publicDeliveryMode: resolveR2PublicDeliveryMode(),
    publicBaseUrl: trimTrailingSlash(getRequiredEnvironmentValue("R2_PUBLIC_BASE_URL")),
    publicBucketName: getRequiredEnvironmentValue("R2_BUCKET_NAME"),
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
