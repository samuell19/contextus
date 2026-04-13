import type { ChatTool, ToolExecutionInput, ToolExecutionOutput } from '../contracts/services.js';
import { env } from '../config/env.js';

import { RagService } from './rag.service.js';

export class RagTool implements ChatTool {
  public readonly name = 'rag_retrieve';

  public constructor(private readonly ragService: RagService) {}

  public canRun(input: ToolExecutionInput) {
    console.info('[RAG-TOOL] canRun check', {
      userId: input.userId,
      agentId: input.agentId,
      ragEnabled: input.ragEnabled
    });
    return input.ragEnabled;
  }

  public async run(input: ToolExecutionInput): Promise<ToolExecutionOutput | null> {
    console.info('[RAG-TOOL] Retrieval started', {
      userId: input.userId,
      agentId: input.agentId,
      topK: input.ragTopK
    });

    input.onEvent?.({ event: 'log', data: 'Consultando base vetorial...' });

    const rows = await this.ragService.retrieveContext({
      userId: input.userId,
      agentId: input.agentId,
      prompt: input.prompt,
      apiKey: input.apiKey,
      topK: Math.max(1, input.ragTopK || env.RAG_TOP_K_DEFAULT)
    });

    if (rows.length === 0) {
      console.info('[RAG-TOOL] No chunks found for this prompt', {
        userId: input.userId,
        agentId: input.agentId
      });
      return null;
    }

    console.info('[RAG-TOOL] Chunks found', {
      userId: input.userId,
      agentId: input.agentId,
      count: rows.length
    });

    input.onEvent?.({
      event: 'rag_chunks',
      data: rows.map(r => ({ content: r.content, score: r.score }))
    });

    const chunks = rows
      .map((row, index) => {
        const score = Number.isFinite(row.score) ? row.score.toFixed(4) : 'n/a';
        return `Trecho ${index + 1} (score: ${score}):\n${row.content}`;
      })
      .join('\n\n');

    return {
      name: this.name,
      content: chunks
    };
  }
}
