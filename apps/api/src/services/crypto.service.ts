import crypto from 'node:crypto';

import { env } from '../config/env.js';

export type EncryptedPayload = {
  encryptedValue: string;
  iv: string;
  authTag: string;
};

export class CryptoService {
  private readonly key = env.ENCRYPTION_KEY_BUFFER;

  public encrypt(value: string): EncryptedPayload {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  public decrypt(payload: EncryptedPayload): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(payload.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.encryptedValue, 'base64')),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }
}
