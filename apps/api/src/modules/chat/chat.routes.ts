import { chatStreamRequestSchema } from '@multiagent/shared';
import { Router } from 'express';

import { AuthenticatedRequest } from '../../common/auth.js';
import { asyncHandler, parseWithSchema } from '../../common/http.js';
import { closeSse, initSse, writeSse } from '../../common/sse.js';
import { ChatService } from './chat.service.js';

export function createChatRouter(chatService: ChatService) {
  const router = Router();

  router.post(
    '/stream',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(chatStreamRequestSchema, request.body);
      initSse(response);

      try {
        const result = await chatService.streamReply({
          userId: auth.sub,
          sessionId: input.sessionId,
          content: input.content,
          onEvent: (payload) => {
            writeSse(response, {
              type: 'event',
              event: payload.event,
              data: payload.data
            });
          },
          onDelta: (delta, accumulated) => {
            writeSse(response, {
              type: 'chunk',
              delta,
              accumulated
            });
          }
        });

        writeSse(response, {
          type: 'done',
          messageId: result.assistantMessageId,
          content: result.content
        });
      } catch (error) {
        writeSse(response, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Falha no streaming'
        });
      } finally {
        closeSse(response);
      }
    })
  );

  return router;
}
