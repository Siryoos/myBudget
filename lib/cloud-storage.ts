import crypto from 'crypto';

// Cloud storage configuration types
export interface CloudStorageConfig {
  provider: 'aws-s3' | 'cloudinary' | 'azure-blob' | 'google-cloud';
  credentials: Record<string, string>;
  defaultBucket?: string;
  region?: string;
  endpoint?: string;
}

export interface PresignedUrlOptions {
  fileName: string;
  mimeType: string;
  fileSize: number;
  folder?: string;
  expiresIn?: number; // seconds
  metadata?: Record<string, string>;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  publicId: string;
  fileKey: string;
  expiresAt: string;
  headers?: Record<string, string>;
}

export interface UploadCompleteData {
  publicId: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  originalName: string;
  metadata?: Record<string, any>;
}

// Base cloud storage provider interface
export abstract class CloudStorageProvider {
  protected config: CloudStorageConfig;

  constructor(config: CloudStorageConfig) {
    this.config = config;
  }

  abstract generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResponse>;
  abstract deleteFile(fileKey: string): Promise<void>;
  abstract generateThumbnail(fileKey: string, options?: any): Promise<string>;
  abstract validateUpload(publicId: string, data: UploadCompleteData): Promise<boolean>;
}

// AWS S3 Provider Implementation
export class S3Provider extends CloudStorageProvider {
  private getS3Client() {
    // In production, use AWS SDK
    // import { S3Client } from "@aws-sdk/client-s3";
    // return new S3Client({ region: this.config.region, credentials: ... });
    
    // Mock implementation for development
    return {
      presignUrl: async (params: any) => {
        const mockUrl = `https://${this.config.defaultBucket}.s3.${this.config.region}.amazonaws.com/${params.Key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${params.Expires}`;
        return mockUrl;
      }
    };
  }

  async generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResponse> {
    const fileKey = this.generateFileKey(options);
    const expiresIn = options.expiresIn || 3600; // 1 hour default
    
    // In production:
    // const command = new PutObjectCommand({
    //   Bucket: this.config.defaultBucket,
    //   Key: fileKey,
    //   ContentType: options.mimeType,
    //   Metadata: options.metadata
    // });
    // const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    // Mock implementation
    const uploadUrl = await this.getS3Client().presignUrl({
      Bucket: this.config.defaultBucket,
      Key: fileKey,
      Expires: expiresIn
    });

    return {
      uploadUrl,
      publicUrl: `https://${this.config.defaultBucket}.s3.${this.config.region}.amazonaws.com/${fileKey}`,
      publicId: this.generatePublicId(),
      fileKey,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      headers: {
        'Content-Type': options.mimeType,
        'Content-Length': options.fileSize.toString()
      }
    };
  }

  async deleteFile(fileKey: string): Promise<void> {
    // In production:
    // const command = new DeleteObjectCommand({
    //   Bucket: this.config.defaultBucket,
    //   Key: fileKey
    // });
    // await s3Client.send(command);
    
    console.log(`[S3] Deleting file: ${fileKey}`);
  }

  async generateThumbnail(fileKey: string, options?: any): Promise<string> {
    // In production, use Lambda function or image processing service
    const thumbnailKey = fileKey.replace(/(\.[^.]+)$/, '_thumb$1');
    return `https://${this.config.defaultBucket}.s3.${this.config.region}.amazonaws.com/${thumbnailKey}`;
  }

  async validateUpload(publicId: string, data: UploadCompleteData): Promise<boolean> {
    // In production, verify file exists and matches metadata
    console.log(`[S3] Validating upload for publicId: ${publicId}`);
    return true;
  }

  private generateFileKey(options: PresignedUrlOptions): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(`${timestamp}-${options.fileName}`).digest('hex').substring(0, 8);
    const folder = options.folder || 'uploads';
    const extension = options.fileName.split('.').pop() || 'bin';
    return `${folder}/${timestamp}-${hash}.${extension}`;
  }

  private generatePublicId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

// Cloudinary Provider Implementation
export class CloudinaryProvider extends CloudStorageProvider {
  async generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResponse> {
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = this.generatePublicId(options);
    
    // In production, use Cloudinary SDK
    // const signature = cloudinary.utils.api_sign_request({
    //   timestamp,
    //   public_id: publicId,
    //   folder: options.folder
    // }, this.config.credentials.apiSecret);

    // Mock implementation
    const signature = crypto
      .createHash('sha256')
      .update(`public_id=${publicId}&timestamp=${timestamp}${this.config.credentials.apiSecret}`)
      .digest('hex');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.config.credentials.cloudName}/image/upload`;
    
    return {
      uploadUrl,
      publicUrl: `https://res.cloudinary.com/${this.config.credentials.cloudName}/image/upload/${publicId}`,
      publicId,
      fileKey: publicId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
  }

  async deleteFile(fileKey: string): Promise<void> {
    // In production:
    // await cloudinary.uploader.destroy(fileKey);
    console.log(`[Cloudinary] Deleting file: ${fileKey}`);
  }

  async generateThumbnail(fileKey: string, options?: any): Promise<string> {
    // Cloudinary generates thumbnails automatically via URL transformation
    return `https://res.cloudinary.com/${this.config.credentials.cloudName}/image/upload/c_thumb,w_200,h_200/${fileKey}`;
  }

  async validateUpload(publicId: string, data: UploadCompleteData): Promise<boolean> {
    // In production, verify with Cloudinary API
    console.log(`[Cloudinary] Validating upload for publicId: ${publicId}`);
    return true;
  }

  private generatePublicId(options: PresignedUrlOptions): string {
    const timestamp = Date.now();
    const folder = options.folder || 'uploads';
    const nameWithoutExt = options.fileName.replace(/\.[^.]+$/, '');
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 20);
    return `${folder}/${sanitizedName}_${timestamp}`;
  }
}

// Factory function to create storage provider
export function createStorageProvider(config: CloudStorageConfig): CloudStorageProvider {
  switch (config.provider) {
    case 'aws-s3':
      return new S3Provider(config);
    case 'cloudinary':
      return new CloudinaryProvider(config);
    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }
}

// Default configuration (from environment variables)
export function getDefaultStorageConfig(): CloudStorageConfig {
  const provider = process.env.STORAGE_PROVIDER as CloudStorageConfig['provider'] || 'aws-s3';
  
  if (provider === 'aws-s3') {
    return {
      provider: 'aws-s3',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      },
      defaultBucket: process.env.AWS_S3_BUCKET || 'smartsave-uploads',
      region: process.env.AWS_REGION || 'us-east-1'
    };
  } else if (provider === 'cloudinary') {
    return {
      provider: 'cloudinary',
      credentials: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || ''
      }
    };
  }
  
  throw new Error('Invalid storage provider configuration');
}

// Singleton instance
let storageProvider: CloudStorageProvider | null = null;

export function getStorageProvider(): CloudStorageProvider {
  if (!storageProvider) {
    storageProvider = createStorageProvider(getDefaultStorageConfig());
  }
  return storageProvider;
}

// File validation utilities
export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.slice(0, -2);
      return mimeType.startsWith(category + '/');
    }
    return mimeType === type;
  });
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}

// Export types for use in other modules
// Export types (avoiding conflicts with existing declarations)
export type { 
  CloudStorageConfig as CloudStorageConfigType, 
  PresignedUrlOptions as PresignedUrlOptionsType, 
  PresignedUrlResponse as PresignedUrlResponseType, 
  UploadCompleteData as UploadCompleteDataType 
};
