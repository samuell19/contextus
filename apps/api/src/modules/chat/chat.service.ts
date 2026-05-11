import type { ContextBudgetDto } from '@multiagent/shared';

import { env } from '../../config/env.js';
import type {
  ContextAssembler,
  MemoryServiceContract,
  ModelGateway,
  ToolOrchestrator
} from '../../contracts/services.js';
import { Agent, MemorySnapshot, Message, Session, UserApiCredential } from '../../models/index.js';
import { AppError } from '../../common/http.js';
import { CryptoService } from '../../services/crypto.service.js';
import { ContextBudgetService } from '../../services/context-budget.service.js';
import { ragMetricsService } from '../../services/rag-metrics.service.js';

export class ChatService {
  public constructor(
    private readonly gateway: ModelGateway,
    private readonly contextAssembler: ContextAssembler,
    private readonly memoryService: MemoryServiceContract,
    private readonly cryptoService: CryptoService,
    private readonly toolOrchestrator: ToolOrchestrator,
    private readonly contextBudgetService: ContextBudgetService
  ) {}

  public async streamReply(input: {
    userId: string;
    sessionId: string;
    content: string;
    onEvent: (event: { event: string; data?: any }) => void;
    onDelta: (delta: string, accumulated: string) => void;
  }) {
    const turnStartedAt = Date.now();

    console.info('[CHAT] Turn started', {
      userId: input.userId,
      sessionId: input.sessionId
    });

    const session = await Session.findOne({ where: { id: input.sessionId, userId: input.userId } });

    if (!session) {
      throw new AppError(404, 'Sessao nao encontrada');
    }

    const [agent, credential] = await Promise.all([
      Agent.findOne({ where: { id: session.agentId, userId: input.userId } }),
      UserApiCredential.findOne({ where: { userId: input.userId } })
    ]);

    if (!agent) {
      throw new AppError(404, 'Agente nao encontrado');
    }

    if (!credential && !env.OPENROUTER_API_KEY) {
      throw new AppError(400, 'Cadastre sua API key do OpenRouter antes de conversar');
    }

    const apiKey = credential
      ? this.cryptoService.decrypt({
          encryptedValue: credential.encryptedValue,
          iv: credential.iv,
          authTag: credential.authTag
        })
      : (env.OPENROUTER_API_KEY as string);

    const userMessage = await Message.create({
      sessionId: session.id,
      role: 'user',
      content: input.content
    });

    if (session.title === 'Nova sessao') {
      session.title = input.content.slice(0, 60);
    }

    session.lastMessageAt = new Date();
    await session.save();

    const [historyMessagesDesc, agentMemory, sessionMemory] = await Promise.all([
      Message.findAll({
        where: { sessionId: session.id },
        order: [['createdAt', 'DESC']],
        limit: env.CHAT_HISTORY_LIMIT
      }),
      MemorySnapshot.findOne({ where: { ownerType: 'agent', ownerId: agent.id } }),
      MemorySnapshot.findOne({ where: { ownerType: 'session', ownerId: session.id } })
    ]);
    const historyMessages = [...historyMessagesDesc].reverse();

    const transientLogs: Array<{ event: string; data?: any }> = [];

    const toolResults = await this.toolOrchestrator.execute({
      userId: input.userId,
      agentId: agent.id,
      ragEnabled: agent.ragEnabled,
      ragTopK: agent.ragTopK,
      apiKey,
      prompt: input.content,
      onEvent: (event) => {
        transientLogs.push(event);
        input.onEvent(event);
      }
    });

    console.info('[CHAT] Tools executed', {
      userId: input.userId,
      sessionId: session.id,
      agentId: agent.id,
      ragEnabled: agent.ragEnabled,
      ragTopK: agent.ragTopK,
      toolCount: toolResults.length,
      tools: toolResults.map((tool) => tool.name)
    });

    const toolContext = toolResults
      .map((tool) => `Tool: ${tool.name}\n${tool.content}`)
      .join('\n\n')
      .trim();

    const toolChunksUsed = transientLogs.reduce((total, event) => {
      if (event.event !== 'rag_chunks' || !Array.isArray(event.data)) {
        return total;
      }

      return total + event.data.length;
    }, 0);

    const preparedContext = this.contextBudgetService.prepare({
      agentPrompt: agent.systemPrompt,
      agentMemorySummary: agentMemory?.summary ?? null,
      sessionMemorySummary: sessionMemory?.summary ?? null,
      toolContext: toolContext || null,
      toolChunksUsed,
      history: historyMessages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    });

    input.onEvent({
      event: 'context_budget',
      data: preparedContext.budget
    });

    console.info('[CHAT] Tool context injection', {
      sessionId: session.id,
      hasToolContext: Boolean(toolContext),
      chars: toolContext.length,
      usedPromptTokens: preparedContext.budget.usedPromptTokens,
      maxPromptTokens: preparedContext.budget.maxPromptTokens,
      compacted: preparedContext.budget.compacted
    });

    let accumulated = '';
    const model = agent.defaultModelSlug || env.OPENROUTER_DEFAULT_MODEL;
    const assembled = this.contextAssembler.assemble({
      agentPrompt: preparedContext.agentPrompt,
      agentMemorySummary: preparedContext.agentMemorySummary,
      sessionMemorySummary: preparedContext.sessionMemorySummary,
      toolContext: preparedContext.toolContext,
      history: preparedContext.history
    });

    const answer = await this.gateway.streamChat({
      apiKey,
      model,
      messages: assembled,
      onDelta: (delta) => {
        accumulated += delta;
        input.onDelta(delta, accumulated);
      }
    });

    const assistantMessage = await Message.create({
      sessionId: session.id,
      role: 'assistant',
      content: answer,
      metadata: this.buildAssistantMetadata({
        ragLogs: transientLogs,
        contextBudget: preparedContext.budget
      })
    });

    session.lastMessageAt = new Date();
    await session.save();

    console.info('[CHAT] Turn finished', {
      sessionId: session.id,
      assistantMessageId: assistantMessage.id,
      answerChars: answer.length
    });
    ragMetricsService.recordChatTurn({
      ragContextUsed: Boolean(toolContext),
      latencyMs: Date.now() - turnStartedAt
    });

    try {
      await this.memoryService.updateAfterTurn({
        userId: input.userId,
        agentId: agent.id,
        sessionId: session.id,
        apiKey,
        updatedFromMessageId: assistantMessage.id
      });
    } catch {
      return { assistantMessageId: assistantMessage.id, content: answer, userMessageId: userMessage.id };
    }

    return { assistantMessageId: assistantMessage.id, content: answer, userMessageId: userMessage.id };
  }

  private buildAssistantMetadata(input: {
    ragLogs: Array<{ event: string; data?: any }>;
    contextBudget: ContextBudgetDto;
  }) {
    const metadata: Record<string, unknown> = {
      contextBudget: input.contextBudget
    };

    if (input.ragLogs.length > 0) {
      metadata['ragLogs'] = input.ragLogs;
    }

    return metadata;
  }
}
