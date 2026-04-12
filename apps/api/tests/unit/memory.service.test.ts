import { describe, expect, it, vi } from 'vitest';

describe('MemoryService contract', () => {
  it('can be instantiated with a model gateway', async () => {
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

    const { MemoryService } = await import('../../src/services/memory.service.js');
    const gateway = {
      streamChat: vi.fn(),
      completeText: vi.fn().mockResolvedValue('Resumo atualizado')
    };

    const service = new MemoryService(gateway);
    expect(service).toBeTruthy();
  });
});
