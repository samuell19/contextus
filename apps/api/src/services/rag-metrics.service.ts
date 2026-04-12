import crypto from 'node:crypto';

import { QueryTypes } from 'sequelize';

import { sequelize } from '../config/database.js';

type MetricEventType =
  | 'upload_received'
  | 'upload_failed'
  | 'indexing_success'
  | 'retrieval'
  | 'chat_turn';

type AggregateRow = {
  startedAt: Date | null;
  totalUploads: string;
  uploadFailures: string;
  indexedSources: string;
  indexedChunks: string;
  retrievalCalls: string;
  retrievalHits: string;
  chatTurns: string;
  chatTurnsWithRagContext: string;
};

type LatencyRow = {
  avg: string | null;
  p50: string | null;
  p95: string | null;
};

const metricTable = 'rag_metric_events';

function toNumber(input: string | null | undefined) {
  if (input === null || input === undefined) {
    return 0;
  }

  const value = Number(input);
  return Number.isFinite(value) ? value : 0;
}

function toLatency(input: LatencyRow) {
  return {
    avg: Number(toNumber(input.avg).toFixed(2)),
    p50: Number(toNumber(input.p50).toFixed(2)),
    p95: Number(toNumber(input.p95).toFixed(2))
  };
}

export class RagMetricsService {
  public recordUploadReceived() {
    this.persistEvent('upload_received');
  }

  public recordUploadFailed() {
    this.persistEvent('upload_failed');
  }

  public recordIndexingResult(chunkCount: number, latencyMs: number) {
    this.persistEvent('indexing_success', latencyMs, { chunkCount: Math.max(0, chunkCount) });
  }

  public recordRetrieval(resultCount: number, latencyMs: number) {
    this.persistEvent('retrieval', latencyMs, { resultCount: Math.max(0, resultCount) });
  }

  public recordChatTurn(input: { ragContextUsed: boolean; latencyMs: number }) {
    this.persistEvent('chat_turn', input.latencyMs, { ragContextUsed: input.ragContextUsed });
  }

  public async summary() {
    const [aggregate] = await sequelize.query<AggregateRow>(
      `
        SELECT
          MIN(created_at) AS "startedAt",
          SUM(CASE WHEN event_type = 'upload_received' THEN 1 ELSE 0 END)::text AS "totalUploads",
          SUM(CASE WHEN event_type = 'upload_failed' THEN 1 ELSE 0 END)::text AS "uploadFailures",
          SUM(CASE WHEN event_type = 'indexing_success' THEN 1 ELSE 0 END)::text AS "indexedSources",
          COALESCE(SUM(CASE WHEN event_type = 'indexing_success' THEN COALESCE((payload->>'chunkCount')::int, 0) ELSE 0 END), 0)::text AS "indexedChunks",
          SUM(CASE WHEN event_type = 'retrieval' THEN 1 ELSE 0 END)::text AS "retrievalCalls",
          SUM(CASE WHEN event_type = 'retrieval' AND COALESCE((payload->>'resultCount')::int, 0) > 0 THEN 1 ELSE 0 END)::text AS "retrievalHits",
          SUM(CASE WHEN event_type = 'chat_turn' THEN 1 ELSE 0 END)::text AS "chatTurns",
          SUM(CASE WHEN event_type = 'chat_turn' AND COALESCE((payload->>'ragContextUsed')::boolean, false) THEN 1 ELSE 0 END)::text AS "chatTurnsWithRagContext"
        FROM ${metricTable}
      `,
      { type: QueryTypes.SELECT }
    );

    const ingestionLatency = await this.latencySummary('indexing_success');
    const retrievalLatency = await this.latencySummary('retrieval');
    const chatTurnLatency = await this.latencySummary('chat_turn');

    const totalUploads = toNumber(aggregate?.totalUploads);
    const uploadFailures = toNumber(aggregate?.uploadFailures);
    const indexedSources = toNumber(aggregate?.indexedSources);
    const indexedChunks = toNumber(aggregate?.indexedChunks);
    const retrievalCalls = toNumber(aggregate?.retrievalCalls);
    const retrievalHits = toNumber(aggregate?.retrievalHits);
    const chatTurns = toNumber(aggregate?.chatTurns);
    const chatTurnsWithRagContext = toNumber(aggregate?.chatTurnsWithRagContext);

    const avgChunksPerSource = indexedSources > 0 ? indexedChunks / indexedSources : 0;
    const retrievalHitRate = retrievalCalls > 0 ? retrievalHits / retrievalCalls : 0;
    const ragUsageRate = chatTurns > 0 ? chatTurnsWithRagContext / chatTurns : 0;

    return {
      startedAt: (aggregate?.startedAt ?? new Date()).toISOString(),
      totalUploads,
      uploadFailures,
      indexedSources,
      indexedChunks,
      avgChunksPerSource: Number(avgChunksPerSource.toFixed(2)),
      retrievalCalls,
      chatTurns,
      chatTurnsWithRagContext,
      retrievalHitRate: Number(retrievalHitRate.toFixed(4)),
      ragUsageRate: Number(ragUsageRate.toFixed(4)),
      ingestionLatencyMs: ingestionLatency,
      retrievalLatencyMs: retrievalLatency,
      chatTurnLatencyMs: chatTurnLatency
    };
  }

  private persistEvent(eventType: MetricEventType, valueNumber?: number, payload?: Record<string, unknown>) {
    void sequelize
      .query(
        `
          INSERT INTO ${metricTable} (id, event_type, value_number, payload)
          VALUES (:id, :eventType, :valueNumber, CAST(:payload AS jsonb))
        `,
        {
          replacements: {
            id: crypto.randomUUID(),
            eventType,
            valueNumber: valueNumber ?? null,
            payload: JSON.stringify(payload ?? {})
          }
        }
      )
      .catch((error) => {
        console.error('[METRICS] Failed to persist metric event', {
          eventType,
          error: error instanceof Error ? error.message : String(error)
        });
      });
  }

  private async latencySummary(eventType: MetricEventType) {
    const [row] = await sequelize.query<LatencyRow>(
      `
        SELECT
          AVG(value_number)::text AS avg,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value_number)::text AS p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value_number)::text AS p95
        FROM ${metricTable}
        WHERE event_type = :eventType
          AND value_number IS NOT NULL
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { eventType }
      }
    );

    return toLatency(row ?? { avg: null, p50: null, p95: null });
  }
}

export const ragMetricsService = new RagMetricsService();
