import fs from 'node:fs/promises';
import path from 'node:path';

import { createAgentRequestSchema, updateAgentRequestSchema } from '@multiagent/shared';
import { Router } from 'express';
import multer from 'multer';

import { AuthenticatedRequest } from '../../common/auth.js';
import { AppError, asyncHandler, parseWithSchema } from '../../common/http.js';
import { env } from '../../config/env.js';
import {
  Agent,
  KnowledgeSource,
  MemorySnapshot,
  Session,
  UserApiCredential,
  toAgentDto,
  toKnowledgeSourceDto
} from '../../models/index.js';
import { CryptoService } from '../../services/crypto.service.js';
import { RagFileParserService } from '../../services/rag-file-parser.service.js';
import { ragMetricsService } from '../../services/rag-metrics.service.js';
import { RagService } from '../../services/rag.service.js';
import { StorageService } from '../../services/storage.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024
  }
});

export function createAgentsRouter(
  storageService: StorageService,
  ragService: RagService,
  ragFileParser: RagFileParserService,
  cryptoService: CryptoService
) {
  const router = Router();

  const resolveApiKey = async (userId: string, cryptoService: CryptoService) => {
    const credential = await UserApiCredential.findOne({ where: { userId } });

    if (credential) {
      return cryptoService.decrypt({
        encryptedValue: credential.encryptedValue,
        iv: credential.iv,
        authTag: credential.authTag
      });
    }

    if (env.OPENROUTER_API_KEY) {
      return env.OPENROUTER_API_KEY;
    }

    throw new AppError(400, 'Cadastre sua API key do OpenRouter antes de usar RAG');
  };

  const getOwnedAgent = (userId: string, agentId: string) => {
    return Agent.findOne({ where: { id: agentId, userId } });
  };

  router.get(
    '/',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const agents = await Agent.findAll({
        where: { userId: auth.sub },
        order: [['updatedAt', 'DESC']]
      });
      response.json(agents.map(toAgentDto));
    })
  );

  router.post(
    '/',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(createAgentRequestSchema, request.body);
      const agent = await Agent.create({
        userId: auth.sub,
        name: input.name,
        systemPrompt: input.systemPrompt ?? '',
        defaultModelSlug: input.defaultModelSlug ?? null,
        ragEnabled: input.ragEnabled ?? false,
        ragTopK: input.ragTopK ?? env.RAG_TOP_K_DEFAULT
      });
      response.status(201).json(toAgentDto(agent));
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(updateAgentRequestSchema, request.body);
      const agent = await Agent.findOne({ where: { id: request.params['id'], userId: auth.sub } });

      if (!agent) {
        throw new AppError(404, 'Agente nao encontrado');
      }

      if (input.name !== undefined) {
        agent.name = input.name;
      }

      if (input.systemPrompt !== undefined) {
        agent.systemPrompt = input.systemPrompt;
      }

      if (input.defaultModelSlug !== undefined) {
        agent.defaultModelSlug = input.defaultModelSlug ?? null;
      }

      if (input.ragEnabled !== undefined) {
        agent.ragEnabled = input.ragEnabled;
      }

      if (input.ragTopK !== undefined) {
        agent.ragTopK = input.ragTopK;
      }

      await agent.save();
      response.json(toAgentDto(agent));
    })
  );

  router.get(
    '/:id/knowledge/sources',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const agentId = String(request.params['id']);
      const agent = await getOwnedAgent(auth.sub, agentId);

      if (!agent) {
        throw new AppError(404, 'Agente nao encontrado');
      }

      const sources = await KnowledgeSource.findAll({
        where: { userId: auth.sub, agentId: agent.id },
        order: [['createdAt', 'DESC']]
      });

      response.json(sources.map(toKnowledgeSourceDto));
    })
  );

  router.post(
    '/:id/knowledge/sources/upload',
    upload.single('file'),
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const agentId = String(request.params['id']);
      const agent = await getOwnedAgent(auth.sub, agentId);

      if (!agent) {
        throw new AppError(404, 'Agente nao encontrado');
      }

      if (!request.file) {
        throw new AppError(400, 'Arquivo de conhecimento ausente');
      }

      console.info('[RAG] Upload received', {
        userId: auth.sub,
        agentId: agent.id,
        fileName: request.file.originalname,
        mimeType: request.file.mimetype,
        sizeBytes: request.file.size
      });
      ragMetricsService.recordUploadReceived();

      const textContent = await ragFileParser.parse({
        fileName: request.file.originalname,
        mimeType: request.file.mimetype,
        buffer: request.file.buffer
      });

      const source = await KnowledgeSource.create({
        userId: auth.sub,
        agentId: agent.id,
        fileName: request.file.originalname,
        mimeType: request.file.mimetype || 'text/plain',
        sizeBytes: request.file.size,
        chunkCount: 0,
        status: 'processing',
        storagePath: null
      });

      const storagePath = await storageService.saveKnowledgeSource({
        userId: auth.sub,
        agentId: agent.id,
        sourceId: source.id,
        originalName: request.file.originalname,
        buffer: request.file.buffer
      });

      source.storagePath = storagePath;
      await source.save();

      console.info('[RAG] Source persisted, starting vectorization', {
        sourceId: source.id,
        userId: auth.sub,
        agentId: agent.id
      });

      try {
        const indexingStartedAt = Date.now();
        const apiKey = await resolveApiKey(auth.sub, cryptoService);
        const chunkCount = await ragService.ingestSource({
          userId: auth.sub,
          agentId: agent.id,
          sourceId: source.id,
          apiKey,
          textContent
        });

        source.chunkCount = chunkCount;
        source.status = 'ready';
        await source.save();
        ragMetricsService.recordIndexingResult(chunkCount, Date.now() - indexingStartedAt);

        console.info('[RAG] Source indexed successfully', {
          sourceId: source.id,
          chunkCount,
          userId: auth.sub,
          agentId: agent.id
        });
      } catch (error) {
        source.status = 'failed';
        await source.save();
        ragMetricsService.recordUploadFailed();
        console.error('[RAG] Source indexing failed', {
          sourceId: source.id,
          userId: auth.sub,
          agentId: agent.id,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }

      response.status(201).json(toKnowledgeSourceDto(source));
    })
  );

  router.delete(
    '/:id/knowledge/sources/:sourceId',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const agentId = String(request.params['id']);
      const sourceId = String(request.params['sourceId']);
      const agent = await getOwnedAgent(auth.sub, agentId);

      if (!agent) {
        throw new AppError(404, 'Agente nao encontrado');
      }

      const source = await KnowledgeSource.findOne({
        where: {
          id: sourceId,
          userId: auth.sub,
          agentId: agent.id
        }
      });

      if (!source) {
        throw new AppError(404, 'Fonte de conhecimento nao encontrada');
      }

      console.info('[RAG] Deleting source', {
        sourceId: source.id,
        userId: auth.sub,
        agentId: agent.id
      });

      await ragService.deleteSource(source.id);
      await storageService.removeFileIfExists(source.storagePath);
      await source.destroy();

      response.status(204).send();
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const agent = await Agent.findOne({ where: { id: request.params['id'], userId: auth.sub } });

      if (!agent) {
        throw new AppError(404, 'Agente nao encontrado');
      }

      await storageService.removeFileIfExists(agent.avatarPath);
      const sources = await KnowledgeSource.findAll({ where: { userId: auth.sub, agentId: agent.id } });
      for (const source of sources) {
        await storageService.removeFileIfExists(source.storagePath);
      }
      await KnowledgeSource.destroy({ where: { userId: auth.sub, agentId: agent.id } });
      await MemorySnapshot.destroy({ where: { ownerType: 'agent', ownerId: agent.id } });
      await MemorySnapshot.destroy({
        where: {
          ownerType: 'session',
          ownerId: (await Session.findAll({ where: { agentId: agent.id }, attributes: ['id'] })).map(
            (session) => session.id
          )
        }
      });
      await agent.destroy();
      response.status(204).send();
    })
  );

  router.post(
    '/:id/avatar',
    upload.single('avatar'),
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const agent = await Agent.findOne({ where: { id: request.params['id'], userId: auth.sub } });

      if (!agent) {
        throw new AppError(404, 'Agente nao encontrado');
      }

      if (!request.file) {
        throw new AppError(400, 'Arquivo de avatar ausente');
      }

      const filePath = await storageService.saveAgentAvatar({
        userId: auth.sub,
        agentId: agent.id,
        originalName: request.file.originalname,
        buffer: request.file.buffer
      });

      await storageService.removeFileIfExists(agent.avatarPath);
      agent.avatarPath = filePath;
      await agent.save();

      response.json(toAgentDto(agent));
    })
  );

  router.get(
    '/:id/avatar',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const agent = await Agent.findOne({ where: { id: request.params['id'], userId: auth.sub } });

      if (!agent?.avatarPath) {
        throw new AppError(404, 'Avatar nao encontrado');
      }

      await fs.access(agent.avatarPath);
      response.sendFile(path.resolve(agent.avatarPath));
    })
  );

  return router;
}
