import { createHash } from 'crypto';

// Size constants
const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

// File validation configuration
export const FILE_VALIDATION_CONFIG = {
  images: {
    maxSize: 5 * MEGABYTE, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    // Magic numbers for file type verification
    signatures: {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46, 0x38],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
    },
  },
  documents: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
    signatures: {
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
    },
  },
};

// Malicious content patterns
const MALICIOUS_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers
  /<embed[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /data:.*base64/gi, // Data URLs that might contain scripts
];

export class FileValidator {
  /**
   * Validate file size
   */
  static validateSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * Validate file extension
   */
  static validateExtension(filename: string, allowedExtensions: string[]): boolean {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return allowedExtensions.includes(ext);
  }

  /**
   * Validate MIME type
   */
  static validateMimeType(file: File, allowedMimeTypes: string[]): boolean {
    return allowedMimeTypes.includes(file.type);
  }

  /**
   * Verify file signature (magic numbers)
   */
  static async verifyFileSignature(
    file: File,
    signatures: Record<string, number[]>,
  ): Promise<boolean> {
    const mimeSignature = signatures[file.type];
    if (!mimeSignature) {return true;} // Skip if no signature defined

    // Prefer reading from the File itself to avoid relying on Response in test envs
    let buffer: ArrayBuffer;
    if (typeof (file as any).arrayBuffer === 'function') {
      const full = await (file as any).arrayBuffer();
      buffer = full.slice(0, mimeSignature.length);
    } else {
      const sliced = file.slice(0, mimeSignature.length);
      // Some environments lack Blob.arrayBuffer on the slice result
      if (typeof (sliced as any).arrayBuffer === 'function') {
        buffer = await (sliced as any).arrayBuffer();
      } else if (typeof (file as any).text === 'function') {
        // Fallback: read as text and convert (sufficient for tests using ASCII payload)
        const txt = await (file as any).text();
        const bytes = new TextEncoder().encode(txt);
        buffer = bytes.slice(0, mimeSignature.length).buffer;
      } else {
        throw new Error('Unable to read file bytes for signature check');
      }
    }
    const bytes = new Uint8Array(buffer);

    return mimeSignature.every((byte, index) => bytes[index] === byte);
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    filename = filename.replace(/\.\./g, '');
    filename = filename.replace(/[\/\\]/g, '');

    // Remove special characters except dots and hyphens
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Extract extension and base name
    const lastDotIndex = filename.lastIndexOf('.');
    const hasExtension = lastDotIndex !== -1;
    const extension = hasExtension ? filename.substring(lastDotIndex) : '';
    const baseName = hasExtension ? filename.substring(0, lastDotIndex) : filename;

    // Calculate timestamp length (Date.now() returns a number, toString() converts to string)
    const timestamp = Date.now().toString();
    const timestampLength = timestamp.length;

    // Calculate allowed base name length to ensure final filename <= 255 characters
    // Final format: trimmedBase + '_' + timestamp + extension
    const maxLength = 255;
    const underscoreLength = 1;
    const allowedBaseLength = maxLength - underscoreLength - timestampLength - extension.length;

    // Trim base name to allowed length (ensure it's not negative)
    const trimmedBase = allowedBaseLength > 0
      ? baseName.substring(0, allowedBaseLength)
      : baseName.substring(0, Math.max(0, maxLength - timestampLength - extension.length));

    // Rebuild filename with timestamp
    return `${trimmedBase}_${timestamp}${extension}`;
  }

  /**
   * Check for malicious content in SVG files
   */
  static async checkSVGSafety(file: File): Promise<boolean> {
    if (file.type !== 'image/svg+xml') {return true;}

    const text = await file.text();

    // Check for malicious patterns
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(text)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate file hash for integrity checking
   */
  static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Comprehensive file validation
   */
  static async validateFile(
    file: File,
    type: 'images' | 'documents' = 'images',
  ): Promise<{ valid: boolean; error?: string }> {
    const config = FILE_VALIDATION_CONFIG[type];

    // Check file size
    if (!this.validateSize(file, config.maxSize)) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${config.maxSize / 1024 / 1024}MB`,
      };
    }

    // Check file extension
    if (!this.validateExtension(file.name, config.allowedExtensions)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${config.allowedExtensions.join(', ')}`,
      };
    }

    // Check MIME type
    if (!this.validateMimeType(file, config.allowedMimeTypes)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
      };
    }

    // Verify file signature
    const isValidSignature = await this.verifyFileSignature(file, config.signatures);
    if (!isValidSignature) {
      return {
        valid: false,
        error: 'File content does not match its type',
      };
    }

    // Check SVG safety
    if (file.type === 'image/svg+xml') {
      const isSafeSVG = await this.checkSVGSafety(file);
      if (!isSafeSVG) {
        return {
          valid: false,
          error: 'SVG file contains potentially malicious content',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate multiple files
   */
  static async validateFiles(
    files: FileList | File[],
    type: 'images' | 'documents' = 'images',
    maxFiles: number = 10,
  ): Promise<{ valid: boolean; errors: Map<string, string> }> {
    const errors = new Map<string, string>();

    if (files.length > maxFiles) {
      errors.set('count', `Maximum ${maxFiles} files allowed`);
      return { valid: false, errors };
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.validateFile(file, type);

      if (!result.valid) {
        errors.set(file.name, result.error || 'Invalid file');
      }
    }

    return { valid: errors.size === 0, errors };
  }
}

import { useState } from 'react';

// React hook for file validation
export function useFileValidation(type: 'images' | 'documents' = 'images') {
  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const validateFile = async (file: File): Promise<boolean> => {
    setValidating(true);
    setErrors(new Map());

    try {
      const result = await FileValidator.validateFile(file, type);

      if (!result.valid) {
        setErrors(new Map([[file.name, result.error || 'Invalid file']]));
      }

      return result.valid;
    } finally {
      setValidating(false);
    }
  };

  const validateFiles = async (files: FileList | File[]): Promise<boolean> => {
    setValidating(true);
    setErrors(new Map());

    try {
      const result = await FileValidator.validateFiles(files, type);
      setErrors(result.errors);
      return result.valid;
    } finally {
      setValidating(false);
    }
  };

  const clearErrors = () => setErrors(new Map());

  return {
    validateFile,
    validateFiles,
    validating,
    errors,
    clearErrors,
    sanitizeFilename: FileValidator.sanitizeFilename,
    generateFileHash: FileValidator.generateFileHash,
  };
}
