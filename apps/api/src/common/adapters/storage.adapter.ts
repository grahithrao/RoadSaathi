import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';

export interface PresignedUploadUrl {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

@Injectable()
export class StorageAdapter {
  private readonly logger = new Logger(StorageAdapter.name);
  private readonly bucket = process.env.S3_BUCKET || 'roadsaathi-evidence';
  private readonly endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';

  /**
   * Generates a pre-signed URL for direct client upload
   */
  async generatePresignedUploadUrl(
    folder: 'evidence' | 'documents' | 'profiles',
    fileName: string,
    mimeType: string
  ): Promise<PresignedUploadUrl> {
    const fileId = crypto.randomUUID();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${folder}/${fileId}_${sanitizedName}`;

    // Development signed URL format
    const publicUrl = `https://storage.roadsaathi.in/${this.bucket}/${fileKey}`;
    const uploadUrl = `${this.endpoint}/${this.bucket}/${fileKey}?signature=${crypto.randomBytes(16).toString('hex')}`;

    this.logger.log(`Generated upload URL for ${fileKey} (${mimeType})`);

    return {
      uploadUrl,
      fileKey,
      publicUrl,
    };
  }
}
