import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from './http.js';

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = AccessTokenPayload & {
  sessionId: string;
};

export type AuthenticatedRequest = Request & {
  auth: AccessTokenPayload;
};

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    next(new AppError(401, 'Token de acesso ausente'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    (request as AuthenticatedRequest).auth = payload;
    next();
  } catch {
    next(new AppError(401, 'Token de acesso invalido'));
  }
}
