import type { StreamChunkPayloadDto } from '@multiagent/shared';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  private readonly apiBaseUrl = String(
    (window as Window & { __APP_CONFIG__?: { apiBaseUrl?: string } }).__APP_CONFIG__?.apiBaseUrl ??
      'http://localhost:3000/api'
  ).replace(/\/$/, '');

  public async streamChat(input: {
    accessToken: string;
    sessionId: string;
    content: string;
    onChunk: (payload: Extract<StreamChunkPayloadDto, { type: 'chunk' }>) => void;
    onEvent?: (payload: Extract<StreamChunkPayloadDto, { type: 'event' }>) => void;
    onDone: (payload: Extract<StreamChunkPayloadDto, { type: 'done' }>) => void;
    onError: (message: string) => void;
  }) {
    const response = await fetch(`${this.apiBaseUrl}/chat/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.accessToken}`
      },
      body: JSON.stringify({
        sessionId: input.sessionId,
        content: input.content
      })
    });

    if (!response.ok || !response.body) {
      throw new Error('Nao foi possivel iniciar o streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const trimmed = chunk.trim();

        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const raw = trimmed.slice(5).trim();

        if (!raw || raw === '[DONE]') {
          continue;
        }

        const payload = JSON.parse(raw) as StreamChunkPayloadDto;

        if (payload.type === 'chunk') {
          input.onChunk(payload);
        }

        if (payload.type === 'event' && input.onEvent) {
          input.onEvent(payload);
        }

        if (payload.type === 'done') {
          input.onDone(payload);
        }

        if (payload.type === 'error') {
          input.onError(payload.message);
        }
      }
    }
  }
}
