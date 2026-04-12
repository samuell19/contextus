import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

const candidateEnvFiles = [
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'apps/api/.env.local'),
  path.resolve(process.cwd(), '../../.env')
];

for (const filePath of candidateEnvFiles) {
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false });
  }
}

const dbConfigSchema = z.object({
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).default('multiagent_platform'),
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().default('postgres')
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  WEB_URL: z.string().url().default('http://localhost:4200'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: dbConfigSchema.shape.DB_HOST,
  DB_PORT: dbConfigSchema.shape.DB_PORT,
  DB_NAME: dbConfigSchema.shape.DB_NAME,
  DB_USER: dbConfigSchema.shape.DB_USER,
  DB_PASSWORD: dbConfigSchema.shape.DB_PASSWORD,
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('ma_refresh'),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(10).optional()
  ),
  OPENROUTER_DEFAULT_MODEL: z.string().min(1),
  OPENROUTER_SUMMARY_MODEL: z.string().min(1),
  OPENROUTER_EMBEDDING_MODEL: z.string().min(1).default('text-embedding-3-small'),
  OPENROUTER_APP_NAME: z.string().default('Multiagent Platform'),
  OPENROUTER_APP_URL: z.string().url().default('http://localhost:3000'),
  CHAT_HISTORY_LIMIT: z.coerce.number().int().positive().default(20),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(5),
  RAG_CHUNK_SIZE: z.coerce.number().int().positive().default(1000),
  RAG_CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(200),
  RAG_TOP_K_DEFAULT: z.coerce.number().int().positive().max(20).default(5),
  RAG_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  RAG_EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(32)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = {
  ...parsed.data,
  DATABASE_URL:
    parsed.data.DATABASE_URL ??
    `postgres://${encodeURIComponent(parsed.data.DB_USER)}:${encodeURIComponent(parsed.data.DB_PASSWORD)}@${parsed.data.DB_HOST}:${parsed.data.DB_PORT}/${parsed.data.DB_NAME}`,
  ENCRYPTION_KEY_BUFFER: Buffer.from(parsed.data.ENCRYPTION_KEY, 'hex')
};

export function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Unsupported duration format: ${duration}`);
  }

  const [, valueText, unit] = match;
  const value = Number(valueText);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24
  };
  const multiplier = multipliers[unit as keyof typeof multipliers];

  if (!multiplier) {
    throw new Error(`Unsupported duration unit: ${unit}`);
  }

  return value * multiplier;
}
