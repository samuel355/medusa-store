import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readEnv } from "@/lib/env";

let r2: S3Client | undefined;

function getR2Client() {
  r2 ??= new S3Client({
    region: "auto",
    endpoint: `https://${readEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: readEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: readEnv("R2_SECRET_ACCESS_KEY")
    }
  });

  return r2;
}

export async function uploadAsset(key: string, body: Buffer | Uint8Array | string, contentType: string) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: readEnv("R2_BUCKET_NAME"),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return `${readEnv("R2_PUBLIC_URL").replace(/\/$/, "")}/${key}`;
}
