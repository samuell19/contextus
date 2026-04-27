import { evalBenchmarkRequestSchema, evalRunRequestSchema } from '@multiagent/shared';
import { Router } from 'express';

import { AuthenticatedRequest } from '../../common/auth.js';
import { asyncHandler, parseWithSchema } from '../../common/http.js';
import { EvalLabService } from './evals.service.js';

export function createEvalsRouter(evalLabService: EvalLabService) {
  const router = Router();

  router.get(
    '/overview',
    asyncHandler(async (_request, response) => {
      response.json(evalLabService.getOverview());
    })
  );

  router.post(
    '/run',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(evalRunRequestSchema, request.body);

      response.json(
        await evalLabService.runScenario({
          userId: auth.sub,
          scenarioId: input.scenarioId,
          modes: input.modes
        })
      );
    })
  );

  router.post(
    '/benchmark',
    asyncHandler(async (request, response) => {
      const auth = (request as AuthenticatedRequest).auth;
      const input = parseWithSchema(evalBenchmarkRequestSchema, request.body);

      response.json(
        await evalLabService.runBenchmark({
          userId: auth.sub,
          modes: input.modes,
          scenarioIds: input.scenarioIds
        })
      );
    })
  );

  return router;
}
