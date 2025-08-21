import { FileValidator } from '@/lib/file-validation';

describe('FileValidator', () => {
  describe('validateSize', () => {
    it('should accept files within size limit', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      expect(FileValidator.validateSize(file, 5 * 1024 * 1024)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB
      
      expect(FileValidator.validateSize(file, 5 * 1024 * 1024)).toBe(false);
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
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      
      expect(FileValidator.validateMimeType(file, ['image/jpeg', 'image/png'])).toBe(true);
    });

    it('should reject disallowed MIME types', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      
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
      const longName = 'a'.repeat(300) + '.jpg';
      const sanitized = FileValidator.sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toContain('.jpg');
    });
  });

  describe('checkSVGSafety', () => {
    it('should accept safe SVG files', async () => {
      const safeSVG = '<svg><circle cx="50" cy="50" r="40" /></svg>';
      const file = new File([safeSVG], 'safe.svg', { type: 'image/svg+xml' });
      
      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(true);
    });

    it('should reject SVG with script tags', async () => {
      const maliciousSVG = '<svg><script>alert("XSS")</script></svg>';
      const file = new File([maliciousSVG], 'malicious.svg', { type: 'image/svg+xml' });
      
      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(false);
    });

    it('should reject SVG with event handlers', async () => {
      const maliciousSVG = '<svg><circle onload="alert(\'XSS\')" /></svg>';
      const file = new File([maliciousSVG], 'malicious.svg', { type: 'image/svg+xml' });
      
      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(false);
    });

    it('should skip non-SVG files', async () => {
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      
      const result = await FileValidator.checkSVGSafety(file);
      expect(result).toBe(true);
    });
  });

  describe('verifyFileSignature', () => {
    it('should verify JPEG signature', async () => {
      // JPEG magic numbers: FF D8 FF
      const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = new File([jpegData], 'test.jpg', { type: 'image/jpeg' });
      
      const signatures = { 'image/jpeg': [0xFF, 0xD8, 0xFF] };
      const result = await FileValidator.verifyFileSignature(file, signatures);
      expect(result).toBe(true);
    });

    it('should reject files with wrong signature', async () => {
      // Wrong magic numbers
      const fakeData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const file = new File([fakeData], 'fake.jpg', { type: 'image/jpeg' });
      
      const signatures = { 'image/jpeg': [0xFF, 0xD8, 0xFF] };
      const result = await FileValidator.verifyFileSignature(file, signatures);
      expect(result).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should accept valid image files', async () => {
      const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = new File([jpegData], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(true);
    });

    it('should reject oversized files', async () => {
      const file = new File(['content'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB
      
      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject files with wrong extension', async () => {
      const file = new File(['content'], 'script.exe', { type: 'image/jpeg' });
      
      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should reject files with wrong MIME type', async () => {
      const file = new File(['content'], 'test.jpg', { type: 'application/x-msdownload' });
      
      const result = await FileValidator.validateFile(file, 'images');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', async () => {
      const files = [
        new File(['content1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'test2.png', { type: 'image/png' })
      ];
      
      const result = await FileValidator.validateFiles(files, 'images');
      expect(result.valid).toBe(true);
      expect(result.errors.size).toBe(0);
    });

    it('should reject when exceeding file count', async () => {
      const files = Array(11).fill(null).map((_, i) => 
        new File(['content'], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const result = await FileValidator.validateFiles(files, 'images', 10);
      expect(result.valid).toBe(false);
      expect(result.errors.get('count')).toContain('Maximum 10 files allowed');
    });

    it('should collect errors for invalid files', async () => {
      const files = [
        new File(['content'], 'valid.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'invalid.exe', { type: 'application/x-msdownload' })
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
      const file1 = new File([content], 'test1.txt');
      const file2 = new File([content], 'test2.txt');
      
      const hash1 = await FileValidator.generateFileHash(file1);
      const hash2 = await FileValidator.generateFileHash(file2);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    });

    it('should generate different hash for different content', async () => {
      const file1 = new File(['content1'], 'test1.txt');
      const file2 = new File(['content2'], 'test2.txt');
      
      const hash1 = await FileValidator.generateFileHash(file1);
      const hash2 = await FileValidator.generateFileHash(file2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
