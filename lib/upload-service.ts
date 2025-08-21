import { apiClient } from './api-client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  publicId: string;
  size: number;
  mimeType: string;
}

export interface UploadOptions {
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  generateThumbnail?: boolean;
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export class UploadService {
  private static instance: UploadService;
  
  private constructor() {}
  
  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }
  
  /**
   * Validates file before upload
   */
  private validateFile(file: File, options: UploadOptions): void {
    const maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    const acceptedTypes = options.acceptedTypes || DEFAULT_ACCEPTED_TYPES;
    
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }
    
    if (!acceptedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not accepted. Accepted types: ${acceptedTypes.join(', ')}`);
    }
  }
  
  /**
   * Get presigned upload URL from backend
   */
  private async getPresignedUrl(
    fileName: string, 
    mimeType: string, 
    folder?: string
  ): Promise<{ uploadUrl: string; publicUrl: string; publicId: string }> {
    const response = await apiClient.request('/api/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        mimeType,
        folder: folder || 'goals'
      })
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get upload URL');
    }
    
    return response.data;
  }
  
  /**
   * Upload file directly to cloud storage
   */
  private async uploadToCloud(
    file: File,
    uploadUrl: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          });
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });
      
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }
  
  /**
   * Generate thumbnail for image
   */
  private async generateThumbnail(file: File, maxWidth: number = 200): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to create canvas context'));
            return;
          }
          
          // Calculate dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          }, 'image/jpeg', 0.8);
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Main upload method
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file, options);
      
      // Get presigned URL
      const { uploadUrl, publicUrl, publicId } = await this.getPresignedUrl(
        file.name,
        file.type,
        options.folder
      );
      
      // Upload file
      await this.uploadToCloud(file, uploadUrl, options.onProgress);
      
      // Generate thumbnail if requested and file is an image
      let thumbnailUrl: string | undefined;
      if (options.generateThumbnail && file.type.startsWith('image/')) {
        try {
          const thumbnailBlob = await this.generateThumbnail(file);
          const thumbnailFile = new File([thumbnailBlob], `thumb_${file.name}`, { type: 'image/jpeg' });
          
          const { uploadUrl: thumbUploadUrl, publicUrl: thumbPublicUrl } = await this.getPresignedUrl(
            thumbnailFile.name,
            thumbnailFile.type,
            `${options.folder}/thumbnails`
          );
          
          await this.uploadToCloud(thumbnailFile, thumbUploadUrl);
          thumbnailUrl = thumbPublicUrl;
        } catch (error) {
          console.error('Failed to generate thumbnail:', error);
          // Continue without thumbnail
        }
      }
      
      // Notify backend of successful upload
      await apiClient.request('/api/upload/complete', {
        method: 'POST',
        body: JSON.stringify({
          publicId,
          url: publicUrl,
          thumbnailUrl,
          size: file.size,
          mimeType: file.type,
          originalName: file.name
        })
      });
      
      return {
        url: publicUrl,
        thumbnailUrl,
        publicId,
        size: file.size,
        mimeType: file.type
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }
  
  /**
   * Delete uploaded file
   */
  async deleteFile(publicId: string): Promise<void> {
    const response = await apiClient.request('/api/upload/delete', {
      method: 'DELETE',
      body: JSON.stringify({ publicId })
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete file');
    }
  }
}

// Export singleton instance
export const uploadService = UploadService.getInstance();