import { S3Client } from '@aws-sdk/client-s3';

// Solo crear cliente si estamos en modo Wasabi
const isWasabi = process.env.UPLOAD_PROVIDER === 'wasabi';

export const s3Client = isWasabi
  ? new S3Client({
      credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY || '',
        secretAccessKey: process.env.WASABI_SECRET_KEY || '',
      },
      region: process.env.WASABI_REGION || 'us-west-1',
      endpoint:
        process.env.WASABI_ENDPOINT || 'https://s3.us-west-1.wasabisys.com',
      forcePathStyle: true, // Requerido para Wasabi
    })
  : null;

export const bucketName = process.env.WASABI_BUCKET_NAME || '';
export const useWasabi = isWasabi;
