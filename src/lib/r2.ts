import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withTimeout } from "@/lib/with-timeout";

// Cloudflare R2 is S3-API compatible, so the standard AWS SDK v3 client works
// unmodified — just point it at R2's endpoint instead of AWS.
let client: S3Client | null = null;

function getClient() {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

function bucket() {
  return process.env.CLOUDFLARE_R2_BUCKET_NAME!;
}

// R2 is documented to return intermittent 5xx errors under concurrent load
// (see DOCUMENT_DELIVERY_SECURITY_AUDIT.md, Finding 3) — this is the most
// likely real cause of signers occasionally seeing "Couldn't load this
// document." getFromR2() previously made exactly one attempt and threw
// straight through on any failure. A short retry-with-backoff turns a
// transient blip into a slightly slower successful load instead of a hard
// failure the client's own one-shot auto-retry (signing-view.tsx) might not
// land outside of.
const READ_RETRY_ATTEMPTS = 3;
const READ_RETRY_BASE_DELAY_MS = 200;

// Bounds a single GetObjectCommand attempt. This is deliberately NOT relying
// on the AWS SDK's own request-timeout config — that only fires for an
// actual stalled *connection*, and (per the 2026-07-25 audit's follow-up)
// the more useful failure mode to guard against is R2 simply taking a long
// time to respond without erroring at all, which the SDK's own retry/timeout
// machinery won't necessarily catch. withTimeout() is a plain setTimeout
// race, so it catches both cases and is trivially unit-testable (see
// with-timeout.test.ts) without needing real network sockets. 8s is
// generous for what's normally a fast server-to-server hop; worst case with
// all 3 attempts hanging is ~8s*3 + backoff — if that's ever a concern
// against this route's actual Vercel function time budget, set an explicit
// `maxDuration` on the calling route rather than shrinking this further.
const READ_TIMEOUT_MS = 8000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A missing object won't start existing on a second attempt — only retry
// errors that plausibly represent a transient condition (network blip, R2's
// own concurrency-related 5xx, or our own read timing out above), not "this
// key genuinely doesn't exist."
function isRetryableR2Error(err: unknown): boolean {
  const name = (err as { name?: string } | undefined)?.name;
  return name !== "NoSuchKey" && name !== "NotFound";
}

async function withReadRetry<T>(attempt: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < READ_RETRY_ATTEMPTS; i++) {
    try {
      return await withTimeout(attempt(), READ_TIMEOUT_MS);
    } catch (err) {
      lastErr = err;
      if (!isRetryableR2Error(err) || i === READ_RETRY_ATTEMPTS - 1) throw err;
      await sleep(READ_RETRY_BASE_DELAY_MS * 2 ** i);
    }
  }
  // Unreachable (the loop above always returns or throws), but keeps
  // TypeScript satisfied that every path returns or throws.
  throw lastErr;
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * A short-lived presigned PUT URL so the browser can upload a file straight to
 * R2, bypassing the Vercel serverless request-body cap (4.5 MB). The client
 * MUST send the same `Content-Type` on its PUT, since it's part of the signed
 * request. Expiry is deliberately short — the URL is used immediately after
 * it's issued.
 */
export async function getSignedUploadUrl(key: string, contentType: string, expiresIn = 300) {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

/**
 * Returns the raw bytes for an object — used by the file proxy route. Retries
 * a transient failure a couple of times with a short backoff (see
 * withReadRetry above) before giving up.
 */
export async function getFromR2(key: string) {
  return withReadRetry(async () => {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    const byteArray = await result.Body!.transformToByteArray();
    return {
      body: Buffer.from(byteArray),
      contentType: result.ContentType ?? "application/pdf",
    };
  });
}

/**
 * Removes an object — used when a draft document is deleted, so its source
 * PDF doesn't linger in the bucket forever. Swallow-and-log rather than
 * throw on failure: an orphaned R2 object is a minor cost-of-storage
 * annoyance, not worth blocking (or half-completing) the actual document
 * deletion over.
 */
export async function deleteFromR2(key: string) {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    console.error("R2 delete failed", key, err);
  }
}

/**
 * Copies an object to a new key — used by "Duplicate document" so the copy
 * gets its own independent R2 object rather than sharing a `file_path` with
 * the source. Sharing would be cheaper, but the draft-delete route calls
 * deleteFromR2() on a document's own file_path, and two documents pointing
 * at the same key would mean deleting either one deletes the file out from
 * under the other. An extra R2-to-R2 copy (no data through our server) is a
 * small, one-time cost for keeping documents fully independent.
 */
export async function copyInR2(sourceKey: string, destKey: string) {
  await getClient().send(
    new CopyObjectCommand({
      Bucket: bucket(),
      Key: destKey,
      CopySource: `${bucket()}/${encodeURIComponent(sourceKey)}`,
    })
  );
  return destKey;
}
