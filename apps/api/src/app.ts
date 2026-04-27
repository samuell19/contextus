import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { requireAuth } from './common/auth.js';
import { errorHandler, notFoundHandler } from './common/http.js';
import { env } from './config/env.js';
import { createAgentsRouter } from './modules/agents/agents.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createChatRouter } from './modules/chat/chat.routes.js';
import { ChatService } from './modules/chat/chat.service.js';
import { createCredentialsRouter } from './modules/credentials/credentials.routes.js';
import { createEvalsRouter } from './modules/evals/evals.routes.js';
import { EvalLabService } from './modules/evals/evals.service.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createMetricsRouter } from './modules/metrics/metrics.routes.js';
import { createSessionsRouter } from './modules/sessions/sessions.routes.js';
import { DefaultContextAssembler } from './services/context-assembler.service.js';
import { CryptoService } from './services/crypto.service.js';
import { MemoryService } from './services/memory.service.js';
import { OpenRouterGateway } from './services/openrouter.gateway.js';
import { RagFileParserService } from './services/rag-file-parser.service.js';
import { RagService } from './services/rag.service.js';
import { RagTool } from './services/rag.tool.js';
import { StorageService } from './services/storage.service.js';
import { ToolOrchestratorService } from './services/tool-orchestrator.service.js';

export function createApp() {
  const app = express();

  const authService = new AuthService();
  const cryptoService = new CryptoService();
  const storageService = new StorageService();
  const gateway = new OpenRouterGateway();
  const contextAssembler = new DefaultContextAssembler();
  const memoryService = new MemoryService(gateway);
  const ragService = new RagService();
  const ragFileParser = new RagFileParserService();
  const toolOrchestrator = new ToolOrchestratorService([new RagTool(ragService)]);
  const chatService = new ChatService(gateway, contextAssembler, memoryService, cryptoService, toolOrchestrator);
  const evalLabService = new EvalLabService(gateway, cryptoService);

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use('/api/health', createHealthRouter());
  app.use('/api/auth', createAuthRouter(authService));
  app.use('/api/me/openrouter-key', requireAuth, createCredentialsRouter(cryptoService));
  app.use('/api/evals', requireAuth, createEvalsRouter(evalLabService));
  app.use('/api/metrics', requireAuth, createMetricsRouter());
  app.use('/api/agents', requireAuth, createAgentsRouter(storageService, ragService, ragFileParser, cryptoService));
  app.use('/api', requireAuth, createSessionsRouter());
  app.use('/api/chat', requireAuth, createChatRouter(chatService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, storageService };
}
