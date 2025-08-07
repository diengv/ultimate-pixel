import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;

  /**
   * Hash a password using scrypt and AES-256-GCM encryption
   * @param password - Plain text password to hash
   * @returns Promise<string> - Hashed password in format: salt:iv:tag:encrypted
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.SALT_LENGTH);
      const iv = randomBytes(this.IV_LENGTH);

      // Derive key from password using scrypt
      const key = (await scryptAsync(password, salt, this.KEY_LENGTH)) as Buffer;

      // Create cipher
      const cipher = createCipheriv(this.ALGORITHM, key, iv);

      // Encrypt the password (we encrypt the password itself for additional security)
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Return combined hash: salt:iv:tag:encrypted (all in hex)
      return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify a password against a hash
   * @param password - Plain text password to verify
   * @param hash - Stored hash in format: salt:iv:tag:encrypted
   * @returns Promise<boolean> - True if password matches, false otherwise
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Parse the hash components
      const parts = hash.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid hash format');
      }

      const [saltHex, ivHex, tagHex, encrypted] = parts;

      // Convert hex strings back to buffers
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      // Derive key from password using the same salt
      const key = (await scryptAsync(password, salt, this.KEY_LENGTH)) as Buffer;

      // Create decipher
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      // Try to decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Compare decrypted password with original
      return decrypted === password;
    } catch (error) {
      // If decryption fails, password is incorrect
      return false;
    }
  }

  /**
   * Generate a random salt (utility method)
   * @param length - Length of salt in bytes (default: 32)
   * @returns Buffer - Random salt
   */
  static generateSalt(length: number = this.SALT_LENGTH): Buffer {
    return randomBytes(length);
  }

  /**
   * Generate a random IV (utility method)
   * @param length - Length of IV in bytes (default: 16)
   * @returns Buffer - Random IV
   */
  static generateIV(length: number = this.IV_LENGTH): Buffer {
    return randomBytes(length);
  }
}