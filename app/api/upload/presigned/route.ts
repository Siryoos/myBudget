import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider, validateFileType, validateFileSize } from '@/lib/cloud-storage';
import { verifyToken } from '@/lib/auth';
import { 
  RequestValidator, 
  createValidationErrorResponse,
  REQUEST_LIMITS,
  commonSchemas 
} from '@/lib/api-validation';
import { z } from 'zod';

// File upload validation schema
const uploadRequestSchema = z.object({
  fileName: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name cannot exceed 255 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'File name contains invalid characters'),
  mimeType: z.string()
    .min(1, 'MIME type is required')
    .max(100, 'MIME type cannot exceed 100 characters'),
  fileSize: z.number()
    .positive('File size must be positive')
    .max(REQUEST_LIMITS.UPLOAD_BODY_SIZE, `File size cannot exceed ${REQUEST_LIMITS.UPLOAD_BODY_SIZE / 1024 / 1024}MB`),
  folder: z.string()
    .max(100, 'Folder name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9._/-]+$/, 'Folder name contains invalid characters')
    .optional()
    .default('goals'),
});

// File upload limits and allowed types
const MAX_FILE_SIZE = REQUEST_LIMITS.UPLOAD_BODY_SIZE; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Validate request size and headers
    const validator = new RequestValidator(request, REQUEST_LIMITS.UPLOAD_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();
    
    // Validate user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header'
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        },
        { status: 401 }
      );
    }

    // Validate and parse request body
    const body = await validator.validateAndParseBody(uploadRequestSchema);
    const { fileName, mimeType, fileSize, folder } = body;

    // Validate file type
    if (!validateFileType(mimeType, ALLOWED_FILE_TYPES)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid file type',
          message: 'Allowed types: JPEG, PNG, GIF, WebP'
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(fileSize, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid file size',
          message: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`
        },
        { status: 400 }
      );
    }

    // Generate presigned URL using cloud storage provider
    const storageProvider = getStorageProvider();
    const presignedData = await storageProvider.generatePresignedUrl({
      fileName,
      mimeType,
      fileSize,
      folder: folder || 'goals',
      metadata: {
        userId: user.id,
        uploadedAt: new Date().toISOString()
      }
    });

    // Log upload request (in production, save to database)
    console.log('[Upload] Presigned URL generated:', {
      userId: user.id,
      fileName,
      mimeType,
      fileSize,
      publicId: presignedData.publicId
    });

    // Return presigned URL data
    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: presignedData.uploadUrl,
        publicUrl: presignedData.publicUrl,
        publicId: presignedData.publicId,
        fileKey: presignedData.fileKey,
        expiresAt: presignedData.expiresAt,
        headers: presignedData.headers
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return createValidationErrorResponse(error);
    }
    
    console.error('[Upload] Error generating presigned URL:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate upload URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
