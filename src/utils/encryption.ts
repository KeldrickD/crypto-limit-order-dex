import { AES, enc } from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-replace-in-production';

export function encrypt(data: string): string {
  return AES.encrypt(data, ENCRYPTION_KEY).toString();
}

export function decrypt(encryptedData: string): string {
  const bytes = AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(enc.Utf8);
} 