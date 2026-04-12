import { openRouterKeyUpdateSchema } from '@multiagent/shared';
import { Router } from 'express';

import { AuthenticatedRequest } from '../../common/auth.js';
import { asyncHandler, parseWithSchema } from '../../common/http.js';
import { env } from '../../config/env.js';
import { toCredentialStatusDto, UserApiCredential } from '../../models/index.js';
import { CryptoService } from '../../services/crypto.service.js';

export function createCredentialsRouter(cryptoService: CryptoService) {
  const router = Router();

  router.get(
    '/status',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const credential = await UserApiCredential.findOne({ where: { userId: auth.sub } });

      if (credential) {
        response.json(toCredentialStatusDto(credential));
        return;
      }

      response.json({
        configured: Boolean(env.OPENROUTER_API_KEY),
        last4: env.OPENROUTER_API_KEY ? env.OPENROUTER_API_KEY.slice(-4) : null,
        source: env.OPENROUTER_API_KEY ? 'environment' : 'none'
      });
    })
  );

  router.put(
    '/',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(openRouterKeyUpdateSchema, request.body);
      const encrypted = cryptoService.encrypt(input.apiKey.trim());
      const last4 = input.apiKey.trim().slice(-4);

      const existing = await UserApiCredential.findOne({ where: { userId: auth.sub } });

      if (existing) {
        existing.encryptedValue = encrypted.encryptedValue;
        existing.iv = encrypted.iv;
        existing.authTag = encrypted.authTag;
        existing.last4 = last4;
        await existing.save();
        response.json(toCredentialStatusDto(existing));
        return;
      }

      const credential = await UserApiCredential.create({
        userId: auth.sub,
        provider: 'openrouter',
        encryptedValue: encrypted.encryptedValue,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        last4
      });

      response.status(201).json(toCredentialStatusDto(credential));
    })
  );

  router.delete(
    '/',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      await UserApiCredential.destroy({ where: { userId: auth.sub } });
      response.status(204).send();
    })
  );

  return router;
}
