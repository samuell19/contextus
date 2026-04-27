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

export const evalModeIdSchema = z.enum([
  'llm_puro',
  'memoria_resumida',
  'rag_enxuto',
  'rag_memoria'
]);

export const evalModeSchema = z.object({
  id: evalModeIdSchema,
  label: z.string(),
  description: z.string()
});

export const evalContextPolicySchema = z.object({
  approxCharsPerToken: z.number().int().positive(),
  maxRecentTurns: z.number().int().nonnegative(),
  maxSummaryChars: z.number().int().nonnegative(),
  maxRagChunks: z.number().int().nonnegative(),
  maxChunkChars: z.number().int().nonnegative(),
  maxTotalContextChars: z.number().int().positive()
});

export const evalDocPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string()
});

export const evalScenarioCategorySchema = z.enum([
  'factual',
  'unanswerable',
  'conflicting',
  'multi_document',
  'long_session'
]);

export const evalScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: evalScenarioCategorySchema,
  goal: z.string(),
  prompt: z.string(),
  whyItMatters: z.string(),
  expectedBehavior: z.string(),
  recommendedModes: z.array(evalModeIdSchema),
  documentIds: z.array(z.string()),
  hasConversationSeed: z.boolean()
});

export const evalLabOverviewSchema = z.object({
  companyName: z.string(),
  companyPitch: z.string(),
  contextPolicy: evalContextPolicySchema,
  modes: z.array(evalModeSchema),
  documents: z.array(evalDocPreviewSchema),
  scenarios: z.array(evalScenarioSchema)
});

export const evalRunRequestSchema = z.object({
  scenarioId: z.string().min(1),
  modes: z.array(evalModeIdSchema).min(1).max(4).optional()
});

export const evalContextSectionSchema = z.object({
  kind: z.enum(['summary', 'recent_turns', 'rag_chunk']),
  title: z.string(),
  content: z.string()
});

export const evalRunScoreSchema = z.object({
  passed: z.boolean(),
  label: z.string(),
  details: z.string(),
  hallucinationRisk: z.boolean()
});

export const evalRunModeResultSchema = z.object({
  mode: evalModeIdSchema,
  label: z.string(),
  answer: z.string(),
  canAnswer: z.boolean(),
  citations: z.array(z.string()),
  latencyMs: z.number().int().nonnegative(),
  estimatedPromptTokens: z.number().int().nonnegative(),
  estimatedResponseTokens: z.number().int().nonnegative(),
  contextChars: z.number().int().nonnegative(),
  savedTranscriptTokens: z.number().int().nonnegative(),
  includedSummary: z.boolean(),
  includedRecentTurns: z.number().int().nonnegative(),
  usedSources: z.array(evalDocPreviewSchema),
  contextSections: z.array(evalContextSectionSchema),
  rawOutput: z.string(),
  score: evalRunScoreSchema
});

export const evalRunResponseSchema = z.object({
  scenario: evalScenarioSchema,
  fullTranscriptTokens: z.number().int().nonnegative(),
  results: z.array(evalRunModeResultSchema)
});

export const evalBenchmarkRequestSchema = z.object({
  modes: z.array(evalModeIdSchema).min(1).max(4),
  scenarioIds: z.array(z.string().min(1)).min(1).optional()
});

export const evalBenchmarkScenarioHistorySchema = z.object({
  scenarioId: z.string(),
  title: z.string(),
  category: evalScenarioCategorySchema,
  passed: z.boolean(),
  scoreLabel: z.string(),
  scoreDetails: z.string(),
  hallucinationRisk: z.boolean(),
  answerPreview: z.string(),
  latencyMs: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative(),
  contextSavingsTokens: z.number().int().nonnegative()
});

export const evalBenchmarkModeSummarySchema = z.object({
  mode: evalModeIdSchema,
  label: z.string(),
  scenariosRun: z.number().int().positive(),
  passedScenarios: z.number().int().nonnegative(),
  failedScenarios: z.number().int().nonnegative(),
  accuracyRate: z.number().min(0).max(1),
  correctAbstentionRate: z.number().min(0).max(1).nullable(),
  hallucinationRate: z.number().min(0).max(1),
  avgLatencyMs: z.number().nonnegative(),
  avgPromptTokens: z.number().nonnegative(),
  avgContextSavingsTokens: z.number().nonnegative(),
  scenarioHistory: z.array(evalBenchmarkScenarioHistorySchema)
});

export const evalBenchmarkResponseSchema = z.object({
  scenarioCount: z.number().int().positive(),
  totalApiCalls: z.number().int().positive(),
  modeSummaries: z.array(evalBenchmarkModeSummarySchema)
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
export type EvalModeId = z.infer<typeof evalModeIdSchema>;
export type EvalModeDto = z.infer<typeof evalModeSchema>;
export type EvalContextPolicyDto = z.infer<typeof evalContextPolicySchema>;
export type EvalDocPreviewDto = z.infer<typeof evalDocPreviewSchema>;
export type EvalScenarioCategoryDto = z.infer<typeof evalScenarioCategorySchema>;
export type EvalScenarioDto = z.infer<typeof evalScenarioSchema>;
export type EvalLabOverviewDto = z.infer<typeof evalLabOverviewSchema>;
export type EvalRunRequestDto = z.infer<typeof evalRunRequestSchema>;
export type EvalContextSectionDto = z.infer<typeof evalContextSectionSchema>;
export type EvalRunScoreDto = z.infer<typeof evalRunScoreSchema>;
export type EvalRunModeResultDto = z.infer<typeof evalRunModeResultSchema>;
export type EvalRunResponseDto = z.infer<typeof evalRunResponseSchema>;
export type EvalBenchmarkRequestDto = z.infer<typeof evalBenchmarkRequestSchema>;
export type EvalBenchmarkScenarioHistoryDto = z.infer<typeof evalBenchmarkScenarioHistorySchema>;
export type EvalBenchmarkModeSummaryDto = z.infer<typeof evalBenchmarkModeSummarySchema>;
export type EvalBenchmarkResponseDto = z.infer<typeof evalBenchmarkResponseSchema>;

export const ownerTypeSchema = z.enum(['agent', 'session']);

export type OwnerType = z.infer<typeof ownerTypeSchema>;
