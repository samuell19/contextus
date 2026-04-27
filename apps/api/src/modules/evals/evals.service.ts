import type {
  EvalBenchmarkModeSummaryDto,
  EvalBenchmarkResponseDto,
  EvalContextSectionDto,
  EvalLabOverviewDto,
  EvalModeId,
  EvalRunModeResultDto,
  EvalRunResponseDto
} from '@multiagent/shared';

import { AppError } from '../../common/http.js';
import { env } from '../../config/env.js';
import type { LlmChatMessage, ModelGateway } from '../../contracts/services.js';
import { UserApiCredential } from '../../models/index.js';
import { CryptoService } from '../../services/crypto.service.js';
import {
  evalContextPolicy,
  evalDocuments,
  evalModes,
  evalScenarios,
  getEvalChunkById,
  getEvalModeById,
  getEvalScenarioById
} from './evals.dataset.js';
import { estimateTokensFromChars, parseEvalAnswer, scoreEvalAnswer } from './evals.scorer.js';

type ModeContextBuild = {
  messages: LlmChatMessage[];
  contextSections: EvalContextSectionDto[];
  contextChars: number;
  promptChars: number;
  includedSummary: boolean;
  includedRecentTurns: number;
  savedTranscriptTokens: number;
  usedSources: EvalRunModeResultDto['usedSources'];
};

export class EvalLabService {
  public constructor(
    private readonly gateway: ModelGateway,
    private readonly cryptoService: CryptoService
  ) {}

  public getOverview(): EvalLabOverviewDto {
    return {
      companyName: 'CliniFlow Saude',
      companyPitch:
        'Empresa ficticia de software para clinicas usada para testes demonstrativos de RAG, memoria resumida e abstencao.',
      contextPolicy: evalContextPolicy,
      modes: evalModes,
      documents: evalDocuments,
      scenarios: evalScenarios.map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        category: scenario.category,
        goal: scenario.goal,
        prompt: scenario.prompt,
        whyItMatters: scenario.whyItMatters,
        expectedBehavior: scenario.expectedBehavior,
        recommendedModes: scenario.recommendedModes,
        documentIds: scenario.documentIds,
        hasConversationSeed: scenario.hasConversationSeed
      }))
    };
  }

  public async runScenario(input: {
    userId: string;
    scenarioId: string;
    modes?: EvalModeId[];
  }): Promise<EvalRunResponseDto> {
    const scenario = getEvalScenarioById(input.scenarioId);

    if (!scenario) {
      throw new AppError(404, 'Cenario de avaliacao nao encontrado');
    }

    const selectedModes = this.uniqueModes(input.modes?.length ? input.modes : scenario.recommendedModes);
    const apiKey = await this.resolveApiKey(input.userId);
    const fullTranscriptChars = scenario.conversationSeed
      ? this.serializeTurns(scenario.conversationSeed.turns).length
      : 0;
    const fullTranscriptTokens = estimateTokensFromChars(fullTranscriptChars);

    const results: EvalRunModeResultDto[] = [];

    for (const mode of selectedModes) {
      results.push(
        await this.runSingleMode({
          apiKey,
          scenarioId: scenario.id,
          mode,
          fullTranscriptChars
        })
      );
    }

    return {
      scenario: {
        id: scenario.id,
        title: scenario.title,
        category: scenario.category,
        goal: scenario.goal,
        prompt: scenario.prompt,
        whyItMatters: scenario.whyItMatters,
        expectedBehavior: scenario.expectedBehavior,
        recommendedModes: scenario.recommendedModes,
        documentIds: scenario.documentIds,
        hasConversationSeed: scenario.hasConversationSeed
      },
      fullTranscriptTokens,
      results
    };
  }

  public async runBenchmark(input: {
    userId: string;
    modes: EvalModeId[];
    scenarioIds?: string[];
  }): Promise<EvalBenchmarkResponseDto> {
    const selectedModes = this.uniqueModes(input.modes);

    if (selectedModes.length === 0) {
      throw new AppError(400, 'Selecione ao menos um modo para o benchmark');
    }

    const selectedScenarios = (input.scenarioIds?.length
      ? evalScenarios.filter((scenario) => input.scenarioIds?.includes(scenario.id))
      : evalScenarios
    ).filter(Boolean);

    if (selectedScenarios.length === 0) {
      throw new AppError(404, 'Nenhum cenario valido foi selecionado para o benchmark');
    }

    const apiKey = await this.resolveApiKey(input.userId);
    const resultsByMode = new Map<EvalModeId, Array<{ scenarioId: string; result: EvalRunModeResultDto }>>();

    for (const mode of selectedModes) {
      resultsByMode.set(mode, []);
    }

    for (const scenario of selectedScenarios) {
      const fullTranscriptChars = this.getFullTranscriptChars(scenario.id);

      for (const mode of selectedModes) {
        const result = await this.runSingleMode({
          apiKey,
          scenarioId: scenario.id,
          mode,
          fullTranscriptChars
        });

        resultsByMode.get(mode)?.push({
          scenarioId: scenario.id,
          result
        });
      }
    }

    const modeSummaries: EvalBenchmarkModeSummaryDto[] = selectedModes.map((modeId) => {
      const mode = getEvalModeById(modeId);
      const entries = resultsByMode.get(modeId) ?? [];
      const results = entries.map((entry) => entry.result);
      const passedCount = results.filter((result) => result.score.passed).length;
      const hallucinationCount = results.filter((result) => result.score.hallucinationRisk).length;
      const unanswerableScenarioIds = selectedScenarios
        .filter((scenario) => !scenario.expected.shouldAnswer)
        .map((scenario) => scenario.id);
      const correctAbstentions = entries.filter(
        (entry) =>
          unanswerableScenarioIds.includes(entry.scenarioId) &&
          entry.result.score.label === 'Abstencao correta'
      ).length;
      const unanswerableCount = unanswerableScenarioIds.length;

      return {
        mode: modeId,
        label: mode?.label ?? modeId,
        scenariosRun: results.length,
        passedScenarios: passedCount,
        failedScenarios: Math.max(results.length - passedCount, 0),
        accuracyRate: results.length > 0 ? passedCount / results.length : 0,
        correctAbstentionRate: unanswerableCount > 0 ? correctAbstentions / unanswerableCount : null,
        hallucinationRate: results.length > 0 ? hallucinationCount / results.length : 0,
        avgLatencyMs: this.average(results.map((result) => result.latencyMs)),
        avgPromptTokens: this.average(results.map((result) => result.estimatedPromptTokens)),
        avgContextSavingsTokens: this.average(results.map((result) => result.savedTranscriptTokens)),
        scenarioHistory: entries.map((entry) => {
          const scenario = selectedScenarios.find((item) => item.id === entry.scenarioId);

          return {
            scenarioId: entry.scenarioId,
            title: scenario?.title ?? entry.scenarioId,
            category: scenario?.category ?? 'factual',
            passed: entry.result.score.passed,
            scoreLabel: entry.result.score.label,
            scoreDetails: entry.result.score.details,
            hallucinationRisk: entry.result.score.hallucinationRisk,
            answerPreview: this.toAnswerPreview(entry.result.answer, entry.result.canAnswer),
            latencyMs: entry.result.latencyMs,
            promptTokens: entry.result.estimatedPromptTokens,
            contextSavingsTokens: entry.result.savedTranscriptTokens
          };
        })
      };
    });

    return {
      scenarioCount: selectedScenarios.length,
      totalApiCalls: selectedScenarios.length * selectedModes.length,
      modeSummaries
    };
  }

  private async runSingleMode(input: {
    apiKey: string;
    scenarioId: string;
    mode: EvalModeId;
    fullTranscriptChars: number;
  }): Promise<EvalRunModeResultDto> {
    const scenario = getEvalScenarioById(input.scenarioId);
    const mode = getEvalModeById(input.mode);

    if (!scenario || !mode) {
      throw new AppError(400, 'Modo ou cenario invalido');
    }

    const context = this.buildModeContext({
      mode: input.mode,
      scenarioId: scenario.id,
      fullTranscriptChars: input.fullTranscriptChars
    });
    const startedAt = Date.now();
    const rawOutput = await this.gateway.completeText({
      apiKey: input.apiKey,
      model: env.OPENROUTER_DEFAULT_MODEL,
      messages: context.messages
    });
    const latencyMs = Date.now() - startedAt;
    const parsed = parseEvalAnswer(rawOutput);
    const score = scoreEvalAnswer({
      answer: parsed.answer,
      canAnswer: parsed.canAnswer,
      citations: parsed.citations,
      shouldAnswer: scenario.expected.shouldAnswer,
      requiredPhrases: scenario.expected.requiredPhrases,
      abstainMarkers: scenario.expected.abstainMarkers,
      preferredCitationIds: scenario.expected.preferredCitationIds,
      requirePreferredCitation: context.usedSources.length > 0
    });

    return {
      mode: input.mode,
      label: mode.label,
      answer: parsed.answer,
      canAnswer: parsed.canAnswer,
      citations: parsed.citations,
      latencyMs,
      estimatedPromptTokens: estimateTokensFromChars(context.promptChars),
      estimatedResponseTokens: estimateTokensFromChars(rawOutput.length),
      contextChars: context.contextChars,
      savedTranscriptTokens: context.savedTranscriptTokens,
      includedSummary: context.includedSummary,
      includedRecentTurns: context.includedRecentTurns,
      usedSources: context.usedSources,
      contextSections: context.contextSections,
      rawOutput,
      score
    };
  }

  private buildModeContext(input: {
    mode: EvalModeId;
    scenarioId: string;
    fullTranscriptChars: number;
  }): ModeContextBuild {
    const scenario = getEvalScenarioById(input.scenarioId);

    if (!scenario) {
      throw new AppError(404, 'Cenario de avaliacao nao encontrado');
    }

    const includeSummary = input.mode === 'memoria_resumida' || input.mode === 'rag_memoria';
    const includeRag = input.mode === 'rag_enxuto' || input.mode === 'rag_memoria';

    let remainingChars = evalContextPolicy.maxTotalContextChars;
    let contextChars = 0;
    let conversationCharsUsed = 0;
    let includedRecentTurnsCount = 0;
    const contextSections: EvalContextSectionDto[] = [];
    const messages: LlmChatMessage[] = [
      {
        role: 'system',
        content: [
          'Voce participa de um laboratorio de avaliacao de RAG e memoria.',
          'Responda apenas com base no contexto fornecido nesta conversa.',
          'Se o contexto nao for suficiente, marque canAnswer=false e explique brevemente.',
          'Nunca invente pessoas, valores, prazos ou citacoes.',
          'Retorne somente JSON puro no formato {"answer":"...","canAnswer":true,"citations":["chunk_id"]}.',
          'Se nao houver chunk sustentando a resposta, use citations como [] .'
        ].join(' ')
      }
    ];
    const usedSourcesMap = new Map<string, EvalRunModeResultDto['usedSources'][number]>();

    if (includeSummary && scenario.conversationSeed?.summary) {
      const summary = scenario.conversationSeed.summary.slice(0, Math.min(evalContextPolicy.maxSummaryChars, remainingChars));

      if (summary.trim()) {
        messages.push({
          role: 'system',
          content: `Resumo da sessao:\n${summary}`
        });
        contextSections.push({
          kind: 'summary',
          title: 'Resumo comprimido da sessao',
          content: summary
        });
        remainingChars -= summary.length;
        contextChars += summary.length;
        conversationCharsUsed += summary.length;
      }
    }

    if (scenario.conversationSeed?.turns.length) {
      const recentTurns = this.fitRecentTurns(scenario.conversationSeed.turns, remainingChars);

      if (recentTurns.length > 0) {
        messages.push(...recentTurns);
        const transcriptPreview = this.serializeTurns(recentTurns);
        includedRecentTurnsCount = recentTurns.length;

        contextSections.push({
          kind: 'recent_turns',
          title: `Ultimos ${recentTurns.length} turnos`,
          content: transcriptPreview
        });
        remainingChars -= transcriptPreview.length;
        contextChars += transcriptPreview.length;
        conversationCharsUsed += transcriptPreview.length;
      }
    }

    if (includeRag && remainingChars > 0) {
      const relevantChunks = scenario.contextChunkIds
        .map((chunkId) => getEvalChunkById(chunkId))
        .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk))
        .slice(0, evalContextPolicy.maxRagChunks);

      for (const chunk of relevantChunks) {
        if (remainingChars <= 0) {
          break;
        }

        const content = chunk.content.slice(0, Math.min(evalContextPolicy.maxChunkChars, remainingChars)).trim();

        if (!content) {
          continue;
        }

        messages.push({
          role: 'system',
          content: `Chunk ${chunk.id} (${chunk.documentTitle}):\n${content}`
        });
        contextSections.push({
          kind: 'rag_chunk',
          title: `${chunk.id} - ${chunk.title}`,
          content
        });
        remainingChars -= content.length;
        contextChars += content.length;

        if (!usedSourcesMap.has(chunk.documentId)) {
          usedSourcesMap.set(chunk.documentId, {
            id: chunk.documentId,
            title: chunk.documentTitle,
            summary: chunk.summary
          });
        }
      }
    }

    messages.push({
      role: 'user',
      content: scenario.prompt
    });

    const promptChars = messages.reduce((total, message) => total + message.content.length, 0);
    const savedTranscriptTokens = Math.max(
      estimateTokensFromChars(input.fullTranscriptChars - conversationCharsUsed),
      0
    );

    return {
      messages,
      contextSections,
      contextChars,
      promptChars,
      includedSummary: includeSummary && contextSections.some((section) => section.kind === 'summary'),
      includedRecentTurns: includedRecentTurnsCount,
      savedTranscriptTokens,
      usedSources: [...usedSourcesMap.values()]
    };
  }

  private fitRecentTurns(turns: LlmChatMessage[], remainingChars: number) {
    const recentTurns = turns.slice(-evalContextPolicy.maxRecentTurns);
    const fitted: LlmChatMessage[] = [];

    for (let index = recentTurns.length - 1; index >= 0; index -= 1) {
      const turn = recentTurns[index];
      if (!turn) {
        continue;
      }

      const turnChars = turn.content.length + 24;

      if (turnChars > remainingChars) {
        continue;
      }

      fitted.unshift(turn);
      remainingChars -= turnChars;
    }

    return fitted;
  }

  private serializeTurns(turns: LlmChatMessage[]) {
    return turns
      .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join('\n\n');
  }

  private getFullTranscriptChars(scenarioId: string) {
    const scenario = getEvalScenarioById(scenarioId);

    if (!scenario?.conversationSeed) {
      return 0;
    }

    return this.serializeTurns(scenario.conversationSeed.turns).length;
  }

  private uniqueModes(modes: EvalModeId[]) {
    return [...new Set(modes)].filter((modeId): modeId is EvalModeId => Boolean(getEvalModeById(modeId)));
  }

  private average(values: number[]) {
    if (values.length === 0) {
      return 0;
    }

    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  }

  private toAnswerPreview(answer: string, canAnswer: boolean) {
    const trimmed = answer.trim();

    if (!trimmed || trimmed === 'canAnswer=false') {
      return canAnswer ? 'Sem texto util retornado.' : 'O modo preferiu nao responder.';
    }

    return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed;
  }

  private async resolveApiKey(userId: string) {
    const credential = await UserApiCredential.findOne({ where: { userId } });

    if (credential) {
      return this.cryptoService.decrypt({
        encryptedValue: credential.encryptedValue,
        iv: credential.iv,
        authTag: credential.authTag
      });
    }

    if (env.OPENROUTER_API_KEY) {
      return env.OPENROUTER_API_KEY;
    }

    throw new AppError(400, 'Cadastre sua API key do OpenRouter antes de usar o lab de avaliacao');
  }
}
