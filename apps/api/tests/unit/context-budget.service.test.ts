import { describe, expect, it } from 'vitest';

import { ContextBudgetService } from '../../src/services/context-budget.service.js';

describe('ContextBudgetService', () => {
  it('builds a compacted context budget when history exceeds the configured window', () => {
    const service = new ContextBudgetService();
    const prepared = service.prepare({
      agentPrompt: 'Seja um assistente objetivo.',
      agentMemorySummary: 'Usuario prefere respostas curtas e diretas.',
      sessionMemorySummary: 'A sessao discute o projeto Atlas e suas restricoes.',
      toolContext: 'Trecho 1: politica atual.\n\nTrecho 2: janela oficial.',
      toolChunksUsed: 2,
      history: Array.from({ length: 14 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `Mensagem ${index + 1} com algum contexto relevante para o turno atual.`
      }))
    });

    expect(prepared.budget.usedPromptTokens).toBeGreaterThan(0);
    expect(prepared.budget.recentMessagesIncluded).toBeGreaterThan(0);
    expect(prepared.budget.recentMessagesDropped).toBeGreaterThan(0);
    expect(prepared.budget.summaryApplied).toBe(true);
    expect(prepared.budget.toolContextApplied).toBe(true);
    expect(prepared.budget.toolChunksUsed).toBe(2);
    expect(prepared.budget.compacted).toBe(true);
    expect(prepared.budget.sections.some((section) => section.kind === 'recent_history')).toBe(true);
  });

  it('keeps usage ratio within bounds and preserves recent history order', () => {
    const service = new ContextBudgetService();
    const prepared = service.prepare({
      agentPrompt: '',
      agentMemorySummary: null,
      sessionMemorySummary: null,
      toolContext: null,
      history: [
        { role: 'user', content: 'Primeira pergunta' },
        { role: 'assistant', content: 'Primeira resposta' },
        { role: 'user', content: 'Segunda pergunta' }
      ]
    });

    expect(prepared.budget.usageRatio).toBeGreaterThanOrEqual(0);
    expect(prepared.budget.usageRatio).toBeLessThanOrEqual(1);
    expect(prepared.history.at(-1)?.content).toContain('Segunda pergunta');
  });
});
