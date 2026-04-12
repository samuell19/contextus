import type { Response } from 'express';

export function initSse(response: Response) {
  response.status(200);
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders();
}

export function writeSse(response: Response, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function closeSse(response: Response) {
  response.write('data: [DONE]\n\n');
  response.end();
}
