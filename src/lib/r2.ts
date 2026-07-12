import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

/** Returns the raw bytes for an object — used by the file proxy route. */
export async function getFromR2(key: string) {
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  const byteArray = await result.Body!.transformToByteArray();
  return {
    body: Buffer.from(byteArray),
    contentType: result.ContentType ?? "application/pdf",
  };
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
