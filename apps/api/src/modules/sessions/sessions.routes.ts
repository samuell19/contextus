import { createSessionRequestSchema, updateSessionRequestSchema } from '@multiagent/shared';
import { Router } from 'express';

import { AuthenticatedRequest } from '../../common/auth.js';
import { AppError, asyncHandler, parseWithSchema } from '../../common/http.js';
import { Agent, MemorySnapshot, Message, Session, toMessageDto, toSessionDto } from '../../models/index.js';

export function createSessionsRouter() {
  const router = Router();

  router.get(
    '/agents/:agentId/sessions',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const sessions = await Session.findAll({
        where: { userId: auth.sub, agentId: request.params['agentId'] },
        order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']]
      });

      response.json(sessions.map(toSessionDto));
    })
  );

  router.post(
    '/agents/:agentId/sessions',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(createSessionRequestSchema, request.body);
      const agent = await Agent.findOne({ where: { id: request.params['agentId'], userId: auth.sub } });

      if (!agent) {
        throw new AppError(404, 'Agente nao encontrado');
      }

      const session = await Session.create({
        userId: auth.sub,
        agentId: agent.id,
        title: input.title ?? 'Nova sessao',
        lastMessageAt: null
      });

      response.status(201).json(toSessionDto(session));
    })
  );

  router.get(
    '/sessions/:id/messages',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const session = await Session.findOne({ where: { id: request.params['id'], userId: auth.sub } });

      if (!session) {
        throw new AppError(404, 'Sessao nao encontrada');
      }

      const messages = await Message.findAll({
        where: { sessionId: session.id },
        order: [['createdAt', 'ASC']]
      });

      response.json(messages.map(toMessageDto));
    })
  );

  router.patch(
    '/sessions/:id',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(updateSessionRequestSchema, request.body);
      const session = await Session.findOne({ where: { id: request.params['id'], userId: auth.sub } });

      if (!session) {
        throw new AppError(404, 'Sessao nao encontrada');
      }

      session.title = input.title;
      await session.save();
      response.json(toSessionDto(session));
    })
  );

  router.delete(
    '/sessions/:id',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const session = await Session.findOne({ where: { id: request.params['id'], userId: auth.sub } });

      if (!session) {
        throw new AppError(404, 'Sessao nao encontrada');
      }

      await MemorySnapshot.destroy({ where: { ownerType: 'session', ownerId: session.id } });
      await session.destroy();
      response.status(204).send();
    })
  );

  return router;
}
