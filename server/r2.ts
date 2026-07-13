/**
 * Cloudflare R2 client (S3-compatible API).
 *
 * Used server-side for uploads / listing. The browser never sees these
 * credentials — portraits are served from the public bucket URL
 * (`VITE_R2_PUBLIC_URL`).
 *
 * Docs: https://developers.cloudflare.com/r2/api/s3/api/
 */
import {
  PutObjectCommand,
  HeadBucketCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand as PutObjectForPresign } from '@aws-sdk/client-s3';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL (r2.dev or custom domain), no trailing slash. */
  publicUrl: string;
}

let client: S3Client | null = null;

/** True when R2 API credentials + bucket are configured. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

/** Read R2 config from env. Throws if incomplete. */
export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = (process.env.R2_PUBLIC_URL ?? process.env.VITE_R2_PUBLIC_URL ?? '').replace(
    /\/$/,
    ''
  );

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'R2 is not fully configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in .env (see .env.example).'
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

/** Lazily create the S3-compatible R2 client. */
export function getR2Client(): S3Client {
  if (client) return client;
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return client;
}

/** Build a public CDN URL for an object key (no credentials needed). */
export function getPublicObjectUrl(key: string): string | null {
  const base = (process.env.R2_PUBLIC_URL ?? process.env.VITE_R2_PUBLIC_URL ?? '').replace(
    /\/$/,
    ''
  );
  if (!base) return null;
  const normalized = key.replace(/^\//, '');
  return `${base}/${normalized}`;
}

/** Upload bytes to R2. Returns the public URL when R2_PUBLIC_URL is set. */
export async function uploadObject(params: {
  key: string;
  body: PutObjectCommandInput['Body'];
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string; publicUrl: string | null }> {
  const { bucket } = getR2Config();
  const s3 = getR2Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
    })
  );
  return { key: params.key, publicUrl: getPublicObjectUrl(params.key) };
}

/** Presigned PUT URL for browser uploads (optional future use). */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 600
): Promise<string> {
  const { bucket } = getR2Config();
  const s3 = getR2Client();
  const command = new PutObjectForPresign({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/** Smoke-check that credentials can reach the bucket. */
export async function verifyR2Bucket(): Promise<boolean> {
  if (!isR2Configured()) return false;
  const { bucket } = getR2Config();
  await getR2Client().send(new HeadBucketCommand({ Bucket: bucket }));
  return true;
}
