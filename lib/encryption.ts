import { randomBytes, createCipheriv, createDecipheriv, scrypt, createHash } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || '';
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Derive key from password
   */
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string): Promise<string> {
    try {
      // Generate salt and IV
      const salt = randomBytes(SALT_LENGTH);
      const iv = randomBytes(IV_LENGTH);

      // Derive key
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Create cipher
      const cipher = createCipheriv(ALGORITHM, key, iv);

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final(),
      ]);

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);

      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = combined.slice(0, SALT_LENGTH);
      const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      // Derive key
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Create decipher
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Mask sensitive data for display
   */
  mask(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) {
      return '*'.repeat(data.length);
    }

    const visible = data.slice(0, visibleChars);
    const masked = '*'.repeat(data.length - visibleChars);
    return visible + masked;
  }

  /**
   * Encrypt object fields
   */
  async encryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[],
  ): Promise<T> {
    const encrypted = { ...obj };

    for (const field of fieldsToEncrypt) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = await this.encrypt(encrypted[field] as string) as T[keyof T];
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object fields
   */
  async decryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[],
  ): Promise<T> {
    const decrypted = { ...obj };

    for (const field of fieldsToDecrypt) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = await this.decrypt(decrypted[field] as string) as T[keyof T];
        } catch (error) {
          // Field might not be encrypted, leave as is
          console.warn(`Failed to decrypt field ${String(field)}`);
        }
      }
    }

    return decrypted;
  }
}

// Client-side encryption for sensitive form data
export class ClientEncryption {
  /**
   * Encrypt sensitive data before sending to server
   */
  static async encryptSensitiveData(data: any, publicKey: string): Promise<string> {
    try {
      // Import public key
      const key = await crypto.subtle.importKey(
        'spki',
        Buffer.from(publicKey, 'base64'),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt'],
      );

      // Encrypt data
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        key,
        encodedData,
      );

      // Return base64 encoded
      return Buffer.from(encrypted).toString('base64');
    } catch (error) {
      throw new Error('Client-side encryption failed');
    }
  }

  /**
   * Generate encryption key pair for secure communication
   */
  static async generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    );

    // Export keys
    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
      publicKey: Buffer.from(publicKey).toString('base64'),
      privateKey: Buffer.from(privateKey).toString('base64'),
    };
  }
}

// Secure storage for client-side
export class SecureStorage {
  private static readonly PREFIX = 'secure_';

  /**
   * Store encrypted data in localStorage
   */
  static async setItem(key: string, value: any, password: string): Promise<void> {
    try {
      const data = JSON.stringify(value);

      // Generate salt
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // Derive key from password
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
      );

      // Encrypt data
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(data),
      );

      // Store encrypted data with metadata
      const stored = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted)),
      };

      localStorage.setItem(this.PREFIX + key, JSON.stringify(stored));
    } catch (error) {
      throw new Error('Failed to store secure data');
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  static async getItem(key: string, password: string): Promise<any> {
    try {
      const stored = localStorage.getItem(this.PREFIX + key);
      if (!stored) {return null;}

      const { salt, iv, data } = JSON.parse(stored);

      // Derive key from password
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
      );

      const cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new Uint8Array(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        cryptoKey,
        new Uint8Array(data),
      );

      const decoded = new TextDecoder().decode(decrypted);
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Failed to retrieve secure data');
    }
  }

  /**
   * Remove secure item
   */
  static removeItem(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  /**
   * Clear all secure items
   */
  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Export singleton instance for server-side
export const encryption = typeof window === 'undefined'
  ? EncryptionService.getInstance()
  : null;
