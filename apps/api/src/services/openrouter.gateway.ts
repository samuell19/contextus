import { AppError } from '../common/http.js';
import { env } from '../config/env.js';
import type { CompleteTextInput, ModelGateway, StreamChatInput } from '../contracts/services.js';

export class OpenRouterGateway implements ModelGateway {
  public async streamChat(input: StreamChatInput) {
    const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
        'HTTP-Referer': env.OPENROUTER_APP_URL,
        'X-Title': env.OPENROUTER_APP_NAME
      },
      body: JSON.stringify({
        model: input.model,
        stream: true,
        messages: input.messages
      })
    });

    if (!response.ok || !response.body) {
      throw new AppError(response.status || 502, await response.text());
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const data = trimmed.slice(5).trim();

        if (!data) {
          continue;
        }

        if (data === '[DONE]') {
          return accumulated;
        }

        try {
          const json = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = json.choices?.[0]?.delta?.content;

          if (delta) {
            accumulated += delta;
            input.onDelta(delta);
          }
        } catch {
          continue;
        }
      }
    }

    return accumulated;
  }

  public async completeText(input: CompleteTextInput) {
    const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
        'HTTP-Referer': env.OPENROUTER_APP_URL,
        'X-Title': env.OPENROUTER_APP_NAME
      },
      body: JSON.stringify({
        model: input.model,
        stream: false,
        messages: input.messages
      })
    });

    if (!response.ok) {
      throw new AppError(response.status || 502, await response.text());
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return payload.choices?.[0]?.message?.content?.trim() ?? '';
  }
}
