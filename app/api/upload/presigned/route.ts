import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider, validateFileType, validateFileSize } from '@/lib/cloud-storage';
import { verifyToken } from '@/lib/auth';

// File upload limits and allowed types
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Validate user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { fileName, mimeType, fileSize, folder } = body;

    // Validate required fields
    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, mimeType, fileSize' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!validateFileType(mimeType, ALLOWED_FILE_TYPES)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(fileSize, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB` },
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
    console.error('[Upload] Error generating presigned URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
