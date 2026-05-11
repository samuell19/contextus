import type { ContextBudgetDto, ContextBudgetSectionDto } from '@multiagent/shared';

import { env } from '../config/env.js';
import type { LlmChatMessage } from '../contracts/services.js';

type PreparedContext = {
  agentPrompt: string;
  agentMemorySummary: string | null;
  sessionMemorySummary: string | null;
  toolContext: string | null;
  history: LlmChatMessage[];
  budget: ContextBudgetDto;
};

type HistorySelectionResult = {
  history: LlmChatMessage[];
  includedCount: number;
  droppedCount: number;
  usedChars: number;
  usedTokens: number;
  compacted: boolean;
};

export class ContextBudgetService {
  public prepare(input: {
    agentPrompt: string;
    agentMemorySummary: string | null;
    sessionMemorySummary: string | null;
    toolContext?: string | null;
    toolChunksUsed?: number;
    history: LlmChatMessage[];
  }): PreparedContext {
    const contextWindowTokens = env.CONTEXT_WINDOW_TOKENS;
    const reservedResponseTokens = env.CONTEXT_RESPONSE_RESERVE_TOKENS;
    const maxPromptTokens = Math.max(256, contextWindowTokens - reservedResponseTokens);
    const maxPromptChars = maxPromptTokens * env.CONTEXT_CHARS_PER_TOKEN;

    let remainingChars = maxPromptChars;
    const sections: ContextBudgetSectionDto[] = [];

    const agentPrompt = this.fitSection({
      kind: 'agent_prompt',
      label: 'Prompt do agente',
      rawContent: input.agentPrompt,
      maxChars: Math.min(remainingChars, env.CONTEXT_AGENT_PROMPT_MAX_TOKENS * env.CONTEXT_CHARS_PER_TOKEN),
      sections
    }) ?? '';
    remainingChars -= agentPrompt.length;

    const agentMemorySummary = this.fitSection({
      kind: 'agent_memory',
      label: 'Memoria do agente',
      rawContent: input.agentMemorySummary,
      maxChars: Math.min(remainingChars, env.CONTEXT_SUMMARY_MAX_TOKENS * env.CONTEXT_CHARS_PER_TOKEN),
      sections
    });
    remainingChars -= agentMemorySummary?.length ?? 0;

    const sessionMemorySummary = this.fitSection({
      kind: 'session_memory',
      label: 'Memoria da sessao',
      rawContent: input.sessionMemorySummary,
      maxChars: Math.min(remainingChars, env.CONTEXT_SUMMARY_MAX_TOKENS * env.CONTEXT_CHARS_PER_TOKEN),
      sections
    });
    remainingChars -= sessionMemorySummary?.length ?? 0;

    const toolContext = this.fitSection({
      kind: 'tool_context',
      label: 'Contexto recuperado',
      rawContent: input.toolContext,
      maxChars: Math.min(remainingChars, env.CONTEXT_TOOL_MAX_TOKENS * env.CONTEXT_CHARS_PER_TOKEN),
      sections
    });
    remainingChars -= toolContext?.length ?? 0;

    const historySelection = this.selectRecentHistory({
      history: input.history,
      remainingChars
    });

    if (historySelection.usedChars > 0) {
      sections.push({
        kind: 'recent_history',
        label: 'Historico recente',
        usedTokens: historySelection.usedTokens,
        chars: historySelection.usedChars,
        compacted: historySelection.compacted
      });
    }

    const usedPromptTokens = sections.reduce((total, section) => total + section.usedTokens, 0);
    const remainingPromptTokens = Math.max(0, maxPromptTokens - usedPromptTokens);

    return {
      agentPrompt,
      agentMemorySummary,
      sessionMemorySummary,
      toolContext,
      history: historySelection.history,
      budget: {
        contextWindowTokens,
        reservedResponseTokens,
        maxPromptTokens,
        usedPromptTokens,
        remainingPromptTokens,
        usageRatio: maxPromptTokens > 0 ? Math.min(1, usedPromptTokens / maxPromptTokens) : 0,
        charsPerToken: env.CONTEXT_CHARS_PER_TOKEN,
        totalHistoryMessages: input.history.length,
        recentMessagesIncluded: historySelection.includedCount,
        recentMessagesDropped: historySelection.droppedCount,
        summaryApplied: Boolean(agentMemorySummary || sessionMemorySummary),
        toolContextApplied: Boolean(toolContext),
        toolChunksUsed: input.toolChunksUsed ?? 0,
        compacted:
          sections.some((section) => section.compacted) || historySelection.compacted || historySelection.droppedCount > 0,
        sections
      }
    };
  }

  private fitSection(input: {
    kind: ContextBudgetSectionDto['kind'];
    label: string;
    rawContent: string | null | undefined;
    maxChars: number;
    sections: ContextBudgetSectionDto[];
  }): string | null {
    const trimmed = input.rawContent?.trim();

    if (!trimmed || input.maxChars <= 0) {
      return null;
    }

    const compacted = trimmed.length > input.maxChars;
    const content = compacted ? this.compactText(trimmed, input.maxChars) : trimmed;

    input.sections.push({
      kind: input.kind,
      label: input.label,
      usedTokens: this.estimateTokens(content),
      chars: content.length,
      compacted
    });

    return content;
  }

  private selectRecentHistory(input: {
    history: LlmChatMessage[];
    remainingChars: number;
  }): HistorySelectionResult {
    if (!input.history.length || input.remainingChars <= 0) {
      return {
        history: [],
        includedCount: 0,
        droppedCount: input.history.length,
        usedChars: 0,
        usedTokens: 0,
        compacted: input.history.length > 0
      };
    }

    const cappedHistory = input.history.slice(-env.CONTEXT_RECENT_MESSAGES_MAX);
    const selected: LlmChatMessage[] = [];
    let remainingChars = input.remainingChars;
    let compacted = input.history.length > cappedHistory.length;

    for (let index = cappedHistory.length - 1; index >= 0; index -= 1) {
      const message = cappedHistory[index]!;
      const normalized = message.content.trim();

      if (!normalized) {
        continue;
      }

      const fullChars = normalized.length;

      if (fullChars <= remainingChars) {
        selected.unshift({ ...message, content: normalized });
        remainingChars -= fullChars;
        continue;
      }

      if (selected.length === 0) {
        const compactedContent = this.compactText(normalized, remainingChars);

        if (compactedContent.trim()) {
          selected.unshift({ ...message, content: compactedContent });
          remainingChars -= compactedContent.length;
        }

        compacted = true;
      } else {
        compacted = true;
      }

      break;
    }

    const usedChars = selected.reduce((total, message) => total + message.content.length, 0);
    const includedCount = selected.length;
    const droppedCount = Math.max(0, input.history.length - includedCount);

    return {
      history: selected,
      includedCount,
      droppedCount,
      usedChars,
      usedTokens: this.estimateTokensFromChars(usedChars),
      compacted: compacted || droppedCount > 0
    };
  }

  private compactText(content: string, maxChars: number) {
    if (maxChars <= 24) {
      return content.slice(0, Math.max(0, maxChars));
    }

    const suffix = '\n...[compactado]';
    const sliceLength = Math.max(0, maxChars - suffix.length);
    return `${content.slice(0, sliceLength).trimEnd()}${suffix}`;
  }

  private estimateTokens(content: string) {
    return this.estimateTokensFromChars(content.length);
  }

  private estimateTokensFromChars(chars: number) {
    return Math.max(1, Math.ceil(chars / env.CONTEXT_CHARS_PER_TOKEN));
  }
}
