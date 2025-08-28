import { FileValidator } from '../../lib/file-validation';

// Constants for file validation tests
const SHA256_HASH_SIZE = 32;
const DEFAULT_FILE_SIZE = 1024 * 1024; // 1MB
const KILOBYTE = 1024;
const JPEG_SOI_MARKER = [0xFF, 0xD8, 0xFF, 0xE0];
const MAX_FILENAME_LENGTH = 255;
const TEST_FILENAME_LENGTH = 300;

// Polyfill TextEncoder for Node.js environment
if (typeof TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = class TextEncoder {
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input, 'utf8'));
    }
  };
}

// Polyfill crypto.subtle for Node.js environment
if (typeof crypto !== 'undefined' && !crypto.subtle) {
  (crypto as unknown as { subtle: { digest: (algorithm: string, data: ArrayBuffer) => Promise<ArrayBuffer> } }).subtle = {
    digest: async (algorithm: string, data: ArrayBuffer): Promise<ArrayBuffer> => {
      // Simple mock implementation for testing that generates consistent hashes
      const content = new Uint8Array(data);
      const hash = new Uint8Array(SHA256_HASH_SIZE); // SHA-256 is 32 bytes

      // Generate a deterministic hash based on content
      for (let i = 0; i < hash.length; i++) {
        hash[i] = content[i % content.length] || i;
      }

      return hash.buffer;
    },
  };
}

// Mock File object methods for Node.js environment
// eslint-disable-next-line max-params
const createMockFile = (
  content: string | Uint8Array,
  name: string,
  options: { type: string },
  customSize?: number,
): File => {
  const enc = new TextEncoder();
  const base =
    typeof content === 'string' ? enc.encode(content) : new Uint8Array(content);
  const desired = customSize ?? base.byteLength || KILOBYTE * KILOBYTE;
  let payload: Uint8Array;
  if (desired <= base.byteLength) {
    payload = base.slice(0, desired);
  } else {
    payload = new Uint8Array(desired);
    payload.set(base);
    // Fill remainder deterministically
    for (let i = base.byteLength; i < desired; i++) payload[i] = 0x41; // 'A'
  }
  const blob = new Blob([payload], options);

  // Create a proper File object
  const file = new File([blob], name, {
    ...options,
    lastModified: Date.now(),
  });

  // Size now naturally reflects the payload length; no override needed.

  // Mock the async methods if they don't exist in the test environment
  if (!file.text) {
    (file as any).text = jest.fn().mockResolvedValue(
      typeof content === 'string' ? content : new TextDecoder().decode(content),
    );
  }

  if (!file.arrayBuffer) {
    (file as any).arrayBuffer = jest.fn().mockResolvedValue(
      typeof content === 'string'
        ? new TextEncoder().encode(content).buffer
        : content.buffer,
    );
  }

  if (!file.slice) {
    (file as any).slice = jest.fn().mockImplementation((start?: number, end?: number, contentType?: string) => {
      const slicedContent = typeof content === 'string'
        ? content.slice(start, end)
        : content.slice(start, end);
      
      // Create a simple blob-like object with arrayBuffer method
      const slicedBlob = {
        size: slicedContent.length,
        type: contentType || options.type,
        arrayBuffer: jest.fn().mockResolvedValue(
          typeof slicedContent === 'string'
            ? new TextEncoder().encode(slicedContent).buffer
            : slicedContent.buffer
        ),
        text: jest.fn().mockResolvedValue(
          typeof slicedContent === 'string' ? slicedContent : new TextDecoder().decode(slicedContent)
        ),
        slice: jest.fn(),
      };
      
      return slicedBlob;
    });
  }

  return file;
};

describe('FileValidator', () => {
  describe('validateSize', () => {
    it('should accept files within size limit', () => {
      const file = createMockFile('content', 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: DEFAULT_FILE_SIZE }); // 1MB

      expect(FileValidator.validateSize(file, 5 * DEFAULT_FILE_SIZE)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const file = createMockFile('content', 'test.jpg', { type: 'image/jpeg' }, 10 * DEFAULT_FILE_SIZE); // 10MB

      expect(FileValidator.validateSize(file, 5 * DEFAULT_FILE_SIZE)).toBe(false);
    });
  });

  describe('validateExtension', () => {
    it('should accept allowed extensions', () => {
      expect(FileValidator.validateExtension('image.jpg', ['.jpg', '.png'])).toBe(true);
      expect(FileValidator.validateExtension('IMAGE.JPG', ['.jpg', '.png'])).toBe(true);
    });

    it('should reject disallowed extensions', () => {
      expect(FileValidator.validateExtension('script.exe', ['.jpg', '.png'])).toBe(false);
    });
  });

  describe('validateMimeType', () => {
    it('should accept allowed MIME types', () => {
      const file = createMockFile('content', 'test.jpg', { type: 'image/jpeg' });

      expect(FileValidator.validateMimeType(file, ['image/jpeg', 'image/png'])).toBe(true);
    });

    it('should reject disallowed MIME types', () => {
      const file = createMockFile('content', 'test.exe', { type: 'application/x-msdownload' });

      expect(FileValidator.validateMimeType(file, ['image/jpeg', 'image/png'])).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      expect(FileValidator.sanitizeFilename('../../../etc/passwd')).not.toContain('..');
      expect(FileValidator.sanitizeFilename('..\\windows\\system32\\file.txt')).not.toContain('..');
    });

    it('should remove special characters', () => {
      const sanitized = FileValidator.sanitizeFilename('my<script>file.jpg');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should preserve allowed characters', () => {
      const filename = 'my-file_name.123.jpg';
      const sanitized = FileValidator.sanitizeFilename(filename);
      expect(sanitized).toContain('my-file_name.123');
      expect(sanitized).toContain('.jpg');
    });

    it('should add timestamp for uniqueness', () => {
      const sanitized = FileValidator.sanitizeFilename('test.jpg');
      expect(sanitized).toMatch(/test_\d+\.jpg/);
    });

    it('should handle long filenames', () => {
      const longName = `${'a'.repeat(TEST_FILENAME_LENGTH)}.jpg`;
      const sanitized = FileValidator.sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(MAX_FILENAME_LENGTH);
      expect(sanitized).toContain('.jpg');
    });
  });

  describe('checkSVGSafety', () => {
    it('should accept safe SVG files', async () => {
      const safeSVG = '<svg><circle cx="50" cy="50" r="40" /></svg>';
      const file = createMockFile(safeSVG, 'safe.svg', { type: 'image/svg+xml' });

      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(true);
    });

    it('should reject SVG with script tags', async () => {
      const maliciousSVG = '<svg><script>alert("XSS")</script></svg>';
      const file = createMockFile(maliciousSVG, 'malicious.svg', { type: 'image/svg+xml' });

      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(false);
    });

    it('should reject SVG with event handlers', async () => {
      const maliciousSVG = '<svg><circle onload="alert(\'XSS\')" /></svg>';
      const file = createMockFile(maliciousSVG, 'malicious.svg', { type: 'image/svg+xml' });

      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(false);
    });

    it('should skip non-SVG files', async () => {
      const file = createMockFile('content', 'image.jpg', { type: 'image/jpeg' });

      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(true);
    });
  });

  describe('verifyFileSignature', () => {
    beforeAll(() => jest.restoreAllMocks());
    it('should verify JPEG signature', async () => {
      // JPEG magic numbers: FF D8 FF E0
      const jpegData = new Uint8Array(JPEG_SOI_MARKER);
      const file = createMockFile(jpegData, 'test.jpg', { type: 'image/jpeg' });

      const signatures = { 'image/jpeg': JPEG_SOI_MARKER.slice(0, 3) };
      const result = await FileValidator.verifyFileSignature(file, signatures);
      expect(result).toBe(true);
    });

    it('should reject files with wrong signature', async () => {
      // Wrong magic numbers
      const fakeData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const file = createMockFile(fakeData, 'fake.jpg', { type: 'image/jpeg' });

      const signatures = { 'image/jpeg': JPEG_SOI_MARKER.slice(0, 3) };
      const result = await FileValidator.verifyFileSignature(file, signatures);
      expect(result).toBe(false);
    });
  });

  describe('validateFile', () => {
    beforeAll(() => {
      jest
        .spyOn(FileValidator, 'verifyFileSignature')
        .mockImplementation(async (file: File) => {
          if (file.name === 'fake.jpg') return false;
          if (file.type === 'image/jpeg' && file.name.endsWith('.jpg')) return true;
          if (file.type === 'image/png' && file.name.endsWith('.png')) return true;
          return false;
        });
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });
    it('should accept valid image files', async () => {
      const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = createMockFile(jpegData, 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(true);
    });

    it('should reject oversized files', async () => {
      const file = createMockFile('content', 'large.jpg', { type: 'image/jpeg' }, 10 * 1024 * 1024); // 10MB

      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject files with wrong extension', async () => {
      const file = createMockFile('content', 'script.exe', { type: 'image/jpeg' });

      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should reject files with wrong MIME type', async () => {
      const file = createMockFile('content', 'test.jpg', { type: 'application/x-msdownload' });

      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', async () => {
      const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const pngData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const files = [
        createMockFile(jpegData, 'test1.jpg', { type: 'image/jpeg' }),
        createMockFile(pngData, 'test2.png', { type: 'image/png' }),
      ];

      const result = await FileValidator.validateFiles(files, 'images');
      expect(result.valid).toBe(true);
      expect(result.errors.size).toBe(0);
    });

    it('should reject when exceeding file count', async () => {
      const files = Array(11).fill(null).map((_, i) =>
        createMockFile('content', `test${i}.jpg`, { type: 'image/jpeg' }),
      );

      const result = await FileValidator.validateFiles(files, 'images', 10);
      expect(result.valid).toBe(false);
      expect(result.errors.get('count')).toContain('Maximum 10 files allowed');
    });

    it('should collect errors for invalid files', async () => {
      const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const files = [
        createMockFile(jpegData, 'valid.jpg', { type: 'image/jpeg' }),
        createMockFile('content', 'invalid.exe', { type: 'application/x-msdownload' }),
      ];

      const result = await FileValidator.validateFiles(files, 'images');
      expect(result.valid).toBe(false);
      expect(result.errors.size).toBe(1);
      expect(result.errors.has('invalid.exe')).toBe(true);
    });
  });

  describe('generateFileHash', () => {
    it('should generate consistent hash for same content', async () => {
      const content = 'test content';
      const file1 = createMockFile(content, 'test1.txt', { type: 'text/plain' });
      const file2 = createMockFile(content, 'test2.txt', { type: 'text/plain' });

      const hash1 = await FileValidator.generateFileHash(file1);
      const hash2 = await FileValidator.generateFileHash(file2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    });

    it('should generate different hash for different content', async () => {
      const file1 = createMockFile('content1', 'test1.txt', { type: 'text/plain' });
      const file2 = createMockFile('content2', 'test2.txt', { type: 'text/plain' });

      const hash1 = await FileValidator.generateFileHash(file1);
      const hash2 = await FileValidator.generateFileHash(file2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
