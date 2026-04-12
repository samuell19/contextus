import { loginRequestSchema, registerRequestSchema } from '@multiagent/shared';
import type { Response } from 'express';
import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../../common/auth.js';
import { asyncHandler, parseWithSchema } from '../../common/http.js';
import { env } from '../../config/env.js';
import { toUserDto } from '../../models/index.js';
import { AuthService } from './auth.service.js';

function setRefreshCookie(response: Response, token: string) {
  response.cookie(env.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

export function createAuthRouter(authService: AuthService) {
  const router = Router();

  router.post(
    '/register',
    asyncHandler(async (request, response) => {
      const input = parseWithSchema(registerRequestSchema, request.body);
      const result = await authService.register({
        ...input,
        metadata: {
          userAgent: request.get('user-agent') ?? null,
          ipAddress: request.ip ?? null
        }
      });

      setRefreshCookie(response, result.refreshToken);
      response.status(201).json({
        user: toUserDto(result.user),
        tokens: {
          accessToken: result.accessToken,
          expiresIn: authService.getAccessTokenTtlSeconds()
        }
      });
    })
  );

  router.post(
    '/login',
    asyncHandler(async (request, response) => {
      const input = parseWithSchema(loginRequestSchema, request.body);
      const result = await authService.login({
        ...input,
        metadata: {
          userAgent: request.get('user-agent') ?? null,
          ipAddress: request.ip ?? null
        }
      });

      setRefreshCookie(response, result.refreshToken);
      response.json({
        user: toUserDto(result.user),
        tokens: {
          accessToken: result.accessToken,
          expiresIn: authService.getAccessTokenTtlSeconds()
        }
      });
    })
  );

  router.post(
    '/refresh',
    asyncHandler(async (request, response) => {
      const token = request.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;
      const result = await authService.refresh(token ?? '', {
        userAgent: request.get('user-agent') ?? null,
        ipAddress: request.ip ?? null
      });

      setRefreshCookie(response, result.refreshToken);
      response.json({
        user: toUserDto(result.user),
        tokens: {
          accessToken: result.accessToken,
          expiresIn: authService.getAccessTokenTtlSeconds()
        }
      });
    })
  );

  router.post(
    '/logout',
    asyncHandler(async (request, response) => {
      const token = request.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;
      await authService.logout(token);
      response.clearCookie(env.REFRESH_COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        path: '/api/auth'
      });
      response.status(204).send();
    })
  );

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      response.json({
        user: {
          id: auth.sub,
          email: auth.email
        }
      });
    })
  );

  return router;
}
