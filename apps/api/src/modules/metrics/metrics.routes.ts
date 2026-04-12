import { Router } from 'express';

import { asyncHandler } from '../../common/http.js';
import { ragMetricsService } from '../../services/rag-metrics.service.js';

export function createMetricsRouter() {
  const router = Router();

  router.get(
    '/rag-summary',
    asyncHandler(async (_request, response) => {
      response.json(await ragMetricsService.summary());
    })
  );

  return router;
}
