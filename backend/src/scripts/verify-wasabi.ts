import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno manualmente
dotenv.config({ path: path.join(__dirname, '../../.env') });

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY || '',
    secretAccessKey: process.env.WASABI_SECRET_KEY || '',
  },
  region: process.env.WASABI_REGION || 'us-west-1',
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.us-west-1.wasabisys.com',
  forcePathStyle: true,
});

const bucketName = process.env.WASABI_BUCKET_NAME || 'ermir';

async function listWasabiFiles() {
  console.log('--- Verificando archivos en Wasabi S3 ---');
  console.log(`Bucket: ${bucketName}`);
  console.log(`Endpoint: ${process.env.WASABI_ENDPOINT}`);

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await s3Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      console.log('❌ El bucket está vacío.');
    } else {
      console.log(`✅ Se encontraron ${response.Contents.length} archivos:`);
      response.Contents.forEach((file) => {
        console.log(` - 📄 Key: ${file.Key}`);
        console.log(
          `   📏 Tamaño: ${(file.Size ? file.Size / 1024 : 0).toFixed(2)} KB`,
        );
        console.log(`   🕒 Fecha: ${file.LastModified}`);
        console.log('   -------------------------');
      });
    }
  } catch (error: any) {
    console.error('❌ Error conectando a Wasabi:', error.message);
    if (error.name === 'InvalidAccessKeyId') {
      console.error('⚠️ Verifica tus credenciales (Access Key).');
    }
    if (error.name === 'SignatureDoesNotMatch') {
      console.error('⚠️ Verifica tu Secret Key.');
    }
  }
}

listWasabiFiles();
