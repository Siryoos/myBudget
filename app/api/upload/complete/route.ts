import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/lib/cloud-storage';
import { validateUser } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Validate user authentication
    const user = await validateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { publicId, url, thumbnailUrl, size, mimeType, originalName } = body;

    // Validate required fields
    if (!publicId || !url || !size || !mimeType || !originalName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate upload with storage provider
    const storageProvider = getStorageProvider();
    const isValid = await storageProvider.validateUpload(publicId, {
      publicId,
      url,
      thumbnailUrl,
      size,
      mimeType,
      originalName
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Upload validation failed' },
        { status: 400 }
      );
    }

    // Generate thumbnail if not provided
    let finalThumbnailUrl = thumbnailUrl;
    if (!thumbnailUrl && mimeType.startsWith('image/')) {
      try {
        finalThumbnailUrl = await storageProvider.generateThumbnail(publicId);
      } catch (error) {
        console.warn('[Upload] Failed to generate thumbnail:', error);
      }
    }

    // Update database with upload information
    // In production, save to database:
    // await query(`
    //   UPDATE file_uploads 
    //   SET url = $1, thumbnail_url = $2, status = 'completed', completed_at = NOW()
    //   WHERE public_id = $3 AND user_id = $4
    // `, [url, finalThumbnailUrl, publicId, user.id]);

    // Log successful upload
    console.log('[Upload] Upload completed:', {
      userId: user.id,
      publicId,
      originalName,
      size,
      mimeType
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        publicId,
        url,
        thumbnailUrl: finalThumbnailUrl,
        uploadedAt: new Date().toISOString(),
        message: 'File uploaded successfully'
      }
    });

  } catch (error) {
    console.error('[Upload] Error completing upload:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint for file deletion
export async function DELETE(request: NextRequest) {
  try {
    // Validate user authentication
    const user = await validateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get file key from query params
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('fileKey');

    if (!fileKey) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    // Delete file using storage provider
    const storageProvider = getStorageProvider();
    await storageProvider.deleteFile(fileKey);

    // Update database
    // In production:
    // await query(`
    //   UPDATE file_uploads 
    //   SET status = 'deleted', deleted_at = NOW()
    //   WHERE file_key = $1 AND user_id = $2
    // `, [fileKey, user.id]);

    console.log('[Upload] File deleted:', {
      userId: user.id,
      fileKey
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('[Upload] Error deleting file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
