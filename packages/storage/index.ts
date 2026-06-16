import { S3Client } from 'bun';
import { env } from './pack-env';

/**
 * Native Bun S3 client (Bun 1.3+) — AWS S3 and any S3-compatible provider
 * (Cloudflare R2, MinIO, DigitalOcean Spaces) via `S3_ENDPOINT`. Stateless
 * HTTP; there is nothing to close.
 */
export const storage = new S3Client({
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  bucket: env.S3_BUCKET,
  region: env.S3_REGION,
  ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
});

type PutData = Parameters<typeof storage.write>[1];
type WriteOptions = Parameters<typeof storage.write>[2];
type PresignOptions = Parameters<typeof storage.presign>[1];

/** Upload `data` to `key`. Returns the number of bytes written. */
export function put(
  key: string,
  data: PutData,
  options?: WriteOptions
): Promise<number> {
  return storage.write(key, data, options);
}

/** Read an object as text (throws an `S3Error` if it doesn't exist). */
export function getText(key: string): Promise<string> {
  return storage.file(key).text();
}

/** Read + JSON-parse an object. */
export function getJson<T>(key: string): Promise<T> {
  return storage.file(key).json() as Promise<T>;
}

/** Read an object as bytes. */
export function getBytes(key: string): Promise<Uint8Array> {
  return storage.file(key).bytes();
}

/** Delete an object (no error if absent). */
export function remove(key: string): Promise<void> {
  return storage.delete(key);
}

/** Whether an object exists (resolves false on a miss; never throws). */
export function exists(key: string): Promise<boolean> {
  return storage.exists(key);
}

/** Object metadata (size, lastModified, etag, type). */
export function stat(key: string) {
  return storage.stat(key);
}

/** Presigned URL to download (GET). Defaults to a 1h expiry. */
export function presignDownload(key: string, options?: PresignOptions): string {
  return storage.presign(key, { expiresIn: 3600, ...options });
}

/** Presigned URL the browser can PUT to upload directly. Defaults to 1h. */
export function presignUpload(key: string, options?: PresignOptions): string {
  return storage.presign(key, { method: 'PUT', expiresIn: 3600, ...options });
}

export { S3Client };
