import crypto from 'node:crypto';

import { QueryTypes } from 'sequelize';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import { AppError } from '../common/http.js';
import { env } from '../config/env.js';
import { sequelize } from '../config/database.js';
import { ragMetricsService } from './rag-metrics.service.js';

type ChunkRow = {
  id: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
};

export class RagService {
  public async ingestSource(input: {
    userId: string;
    agentId: string;
    sourceId: string;
    apiKey: string;
    textContent: string;
  }) {
    console.info('[RAG] Ingestion started', {
      sourceId: input.sourceId,
      userId: input.userId,
      agentId: input.agentId
    });

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: env.RAG_CHUNK_SIZE,
      chunkOverlap: env.RAG_CHUNK_OVERLAP
    });

    const chunks = (await splitter.splitText(input.textContent))
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (chunks.length === 0) {
      throw new AppError(400, 'Nao foi possivel gerar chunks do arquivo enviado');
    }

    console.info('[RAG] Chunks created', {
      sourceId: input.sourceId,
      chunkCount: chunks.length,
      chunkSize: env.RAG_CHUNK_SIZE,
      chunkOverlap: env.RAG_CHUNK_OVERLAP
    });

    await sequelize.query('DELETE FROM knowledge_chunks WHERE source_id = :sourceId', {
      replacements: { sourceId: input.sourceId }
    });

    const embeddings = new OpenAIEmbeddings({
      apiKey: input.apiKey,
      model: env.OPENROUTER_EMBEDDING_MODEL,
      batchSize: env.RAG_EMBEDDING_BATCH_SIZE,
      configuration: {
        baseURL: env.OPENROUTER_BASE_URL
      }
    });

    for (let offset = 0; offset < chunks.length; offset += env.RAG_EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(offset, offset + env.RAG_EMBEDDING_BATCH_SIZE);
      console.info('[RAG] Embedding batch', {
        sourceId: input.sourceId,
        batchStart: offset,
        batchSize: batch.length
      });
      const vectors = await embeddings.embedDocuments(batch);

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
        const vector = vectors[batchIndex];
        const content = batch[batchIndex];

        if (!vector || !content) {
          continue;
        }

        await sequelize.query(
          `
            INSERT INTO knowledge_chunks (
              id,
              source_id,
              user_id,
              agent_id,
              chunk_index,
              content,
              embedding,
              metadata
            )
            VALUES (
              :id,
              :sourceId,
              :userId,
              :agentId,
              :chunkIndex,
              :content,
              CAST(:embedding AS vector),
              CAST(:metadata AS jsonb)
            )
          `,
          {
            replacements: {
              id: crypto.randomUUID(),
              sourceId: input.sourceId,
              userId: input.userId,
              agentId: input.agentId,
              chunkIndex: offset + batchIndex,
              content,
              embedding: this.toVectorLiteral(vector),
              metadata: JSON.stringify({ sourceId: input.sourceId, offset: offset + batchIndex })
            }
          }
        );
      }
    }

    console.info('[RAG] Ingestion finished', {
      sourceId: input.sourceId,
      chunkCount: chunks.length
    });

    return chunks.length;
  }

  public async retrieveContext(input: {
    userId: string;
    agentId: string;
    prompt: string;
    apiKey: string;
    topK: number;
  }) {
    const startedAt = Date.now();

    console.info('[RAG] Retrieval started', {
      userId: input.userId,
      agentId: input.agentId,
      topK: input.topK
    });

    const embeddings = new OpenAIEmbeddings({
      apiKey: input.apiKey,
      model: env.OPENROUTER_EMBEDDING_MODEL,
      batchSize: env.RAG_EMBEDDING_BATCH_SIZE,
      configuration: {
        baseURL: env.OPENROUTER_BASE_URL
      }
    });

    const queryEmbedding = await embeddings.embedQuery(input.prompt);

    const rows = await sequelize.query<ChunkRow>(
      `
        SELECT
          id,
          source_id AS "sourceId",
          content,
          metadata,
          1 - (embedding <=> CAST(:queryEmbedding AS vector)) AS score
        FROM knowledge_chunks
        WHERE user_id = :userId
          AND agent_id = :agentId
        ORDER BY embedding <=> CAST(:queryEmbedding AS vector)
        LIMIT :topK
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          userId: input.userId,
          agentId: input.agentId,
          queryEmbedding: this.toVectorLiteral(queryEmbedding),
          topK: input.topK
        }
      }
    );

    const filtered = rows.filter((row) => row.content?.trim().length > 0);

    console.info('[RAG] Retrieval finished', {
      userId: input.userId,
      agentId: input.agentId,
      returned: filtered.length
    });
    ragMetricsService.recordRetrieval(filtered.length, Date.now() - startedAt);

    return filtered;
  }

  public async deleteSource(sourceId: string) {
    await sequelize.query('DELETE FROM knowledge_chunks WHERE source_id = :sourceId', {
      replacements: { sourceId }
    });
  }

  private toVectorLiteral(values: number[]) {
    return `[${values.join(',')}]`;
  }
}
