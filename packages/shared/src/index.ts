import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive()
});

export const authResponseSchema = z.object({
  user: userSchema,
  tokens: authTokensSchema
});

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const loginRequestSchema = registerRequestSchema;

export const openRouterKeyUpdateSchema = z.object({
  apiKey: z.string().min(10)
});

export const openRouterKeyStatusSchema = z.object({
  configured: z.boolean(),
  last4: z.string().nullable(),
  source: z.enum(['user', 'environment', 'none'])
});

export const agentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  avatarUrl: z.string().nullable(),
  systemPrompt: z.string().default(''),
  defaultModelSlug: z.string().nullable(),
  ragEnabled: z.boolean().default(false),
  ragTopK: z.number().int().positive().max(20).default(5),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createAgentRequestSchema = z.object({
  name: z.string().min(1).max(80),
  systemPrompt: z.string().max(4000).default(''),
  defaultModelSlug: z.string().max(120).nullable().optional(),
  ragEnabled: z.boolean().optional(),
  ragTopK: z.number().int().positive().max(20).optional()
});

export const updateAgentRequestSchema = createAgentRequestSchema.partial();

export const sessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  agentId: z.string().uuid(),
  title: z.string(),
  lastMessageAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createSessionRequestSchema = z.object({
  title: z.string().trim().min(1).max(120).optional()
});

export const updateSessionRequestSchema = z.object({
  title: z.string().trim().min(1).max(120)
});

export const messageRoleSchema = z.enum(['system', 'user', 'assistant']);

export const messageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: messageRoleSchema,
  content: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string().datetime()
});

export const chatStreamRequestSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().trim().min(1).max(20000)
});

export const streamChunkPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chunk'),
    delta: z.string(),
    accumulated: z.string()
  }),
  z.object({
    type: z.literal('done'),
    messageId: z.string().uuid(),
    content: z.string()
  }),
  z.object({
    type: z.literal('error'),
    message: z.string()
  }),
  z.object({
    type: z.literal('event'),
    event: z.string(),
    data: z.any().optional()
  })
]);

export const knowledgeSourceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  agentId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
  status: z.enum(['processing', 'ready', 'failed']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ragMetricsSummarySchema = z.object({
  startedAt: z.string().datetime(),
  totalUploads: z.number().int().nonnegative(),
  uploadFailures: z.number().int().nonnegative(),
  indexedSources: z.number().int().nonnegative(),
  indexedChunks: z.number().int().nonnegative(),
  avgChunksPerSource: z.number().nonnegative(),
  retrievalCalls: z.number().int().nonnegative(),
  chatTurns: z.number().int().nonnegative(),
  chatTurnsWithRagContext: z.number().int().nonnegative(),
  retrievalHitRate: z.number().min(0).max(1),
  ragUsageRate: z.number().min(0).max(1),
  ingestionLatencyMs: z.object({
    avg: z.number().nonnegative(),
    p50: z.number().nonnegative(),
    p95: z.number().nonnegative()
  }),
  retrievalLatencyMs: z.object({
    avg: z.number().nonnegative(),
    p50: z.number().nonnegative(),
    p95: z.number().nonnegative()
  }),
  chatTurnLatencyMs: z.object({
    avg: z.number().nonnegative(),
    p50: z.number().nonnegative(),
    p95: z.number().nonnegative()
  })
});

export type UserDto = z.infer<typeof userSchema>;
export type AuthTokensDto = z.infer<typeof authTokensSchema>;
export type AuthResponseDto = z.infer<typeof authResponseSchema>;
export type RegisterRequestDto = z.infer<typeof registerRequestSchema>;
export type LoginRequestDto = z.infer<typeof loginRequestSchema>;
export type OpenRouterKeyUpdateDto = z.infer<typeof openRouterKeyUpdateSchema>;
export type OpenRouterKeyStatusDto = z.infer<typeof openRouterKeyStatusSchema>;
export type AgentDto = z.infer<typeof agentSchema>;
export type CreateAgentRequestDto = z.infer<typeof createAgentRequestSchema>;
export type UpdateAgentRequestDto = z.infer<typeof updateAgentRequestSchema>;
export type SessionDto = z.infer<typeof sessionSchema>;
export type CreateSessionRequestDto = z.infer<typeof createSessionRequestSchema>;
export type UpdateSessionRequestDto = z.infer<typeof updateSessionRequestSchema>;
export type MessageDto = z.infer<typeof messageSchema>;
export type ChatStreamRequestDto = z.infer<typeof chatStreamRequestSchema>;
export type StreamChunkPayloadDto = z.infer<typeof streamChunkPayloadSchema>;
export type KnowledgeSourceDto = z.infer<typeof knowledgeSourceSchema>;
export type RagMetricsSummaryDto = z.infer<typeof ragMetricsSummarySchema>;

export const ownerTypeSchema = z.enum(['agent', 'session']);

export type OwnerType = z.infer<typeof ownerTypeSchema>;
