import { describe, expect, it } from 'vitest';

describe('CryptoService', () => {
  it('encrypts and decrypts values with AES-256-GCM', async () => {
    process.env['ENCRYPTION_KEY'] =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env['DATABASE_URL'] =
      process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/multiagent_platform';
    process.env['JWT_ACCESS_SECRET'] = process.env['JWT_ACCESS_SECRET'] ?? '1234567890123456';
    process.env['JWT_REFRESH_SECRET'] =
      process.env['JWT_REFRESH_SECRET'] ?? '12345678901234567890';
    process.env['OPENROUTER_DEFAULT_MODEL'] =
      process.env['OPENROUTER_DEFAULT_MODEL'] ?? 'openai/gpt-4o-mini';
    process.env['OPENROUTER_SUMMARY_MODEL'] =
      process.env['OPENROUTER_SUMMARY_MODEL'] ?? 'openai/gpt-4o-mini';

    const { CryptoService } = await import('../../src/services/crypto.service.js');
    const service = new CryptoService();
    const encrypted = service.encrypt('sk-or-v1-example');

    expect(encrypted.encryptedValue).not.toContain('sk-or-v1-example');
    expect(service.decrypt(encrypted)).toBe('sk-or-v1-example');
  });
});
