import bcrypt from 'bcryptjs';

/**
 * Generate a random password
 * @param length Length of the password (default: 12)
 * @returns A random password string
 */
export function generatePassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(length);
  
  // Use Web Crypto API which works in both Node.js and edge runtime
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older Node.js versions
    const cryptoNode = require('crypto');
    const buffer = cryptoNode.randomBytes(length);
    for (let i = 0; i < length; i++) {
      array[i] = buffer[i];
    }
  }
  
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  
  return password;
}

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 * @param password Plain text password
 * @param hash Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a password reset token
 * @returns A secure random token
 */
export function generateResetToken(): string {
  const array = new Uint8Array(32);
  
  // Use Web Crypto API which works in both Node.js and edge runtime
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older Node.js versions
    const cryptoNode = require('crypto');
    const buffer = cryptoNode.randomBytes(32);
    for (let i = 0; i < 32; i++) {
      array[i] = buffer[i];
    }
  }
  
  // Convert to hex string
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get password reset token expiration time (1 hour from now)
 * @returns Date object for token expiration
 */
export function getResetTokenExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 1);
  return expiration;
}
