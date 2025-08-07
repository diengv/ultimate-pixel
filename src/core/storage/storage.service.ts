import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private readonly storageType: string;
  private readonly localPath: string;
  private readonly s3Bucket: string;
  private readonly s3Region: string;

  constructor(private configService: ConfigService) {
    this.storageType = this.configService.get('storage.type', 'local');
    this.localPath = this.configService.get('storage.local.path', './uploads');
    this.s3Bucket = this.configService.get('storage.s3.bucket', '');
    this.s3Region = this.configService.get('storage.s3.region', 'us-east-1');

    if (this.storageType === 's3') {
      this.s3Client = new S3Client({
        region: this.s3Region,
        credentials: {
          accessKeyId: this.configService.get('storage.s3.accessKeyId', ''),
          secretAccessKey: this.configService.get(
            'storage.s3.secretAccessKey',
            '',
          ),
        },
      });
    }
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<UploadResult> {
    if (this.storageType === 's3') {
      return this.uploadToS3(file, filename, mimetype);
    }
    return this.uploadToLocal(file, filename);
  }

  private async uploadToS3(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<UploadResult> {
    const key = `uploads/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
      Body: file,
      ContentType: mimetype,
    });

    await this.s3Client.send(command);

    // Construct URL manually since AWS SDK v3 doesn't return Location
    const url = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      size: file.length,
    };
  }

  private async uploadToLocal(
    file: Buffer,
    filename: string,
  ): Promise<UploadResult> {
    const uploadDir = path.resolve(this.localPath);
    const key = `${Date.now()}-${filename}`;
    const filePath = path.join(uploadDir, key);

    // Ensure the upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file
    await writeFile(filePath, file);

    return {
      url: `/uploads/${key}`,
      key,
      size: file.length,
    };
  }

  async deleteFile(key: string): Promise<void> {
    if (this.storageType === 's3') {
      const command = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } else {
      const filePath = path.join(path.resolve(this.localPath), key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
