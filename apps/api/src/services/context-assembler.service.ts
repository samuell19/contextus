import type { ContextAssembler as ContextAssemblerContract, LlmChatMessage } from '../contracts/services.js';

export class DefaultContextAssembler implements ContextAssemblerContract {
  public assemble(input: {
    agentPrompt: string;
    agentMemorySummary: string | null;
    sessionMemorySummary: string | null;
    toolContext?: string | null;
    history: LlmChatMessage[];
  }): LlmChatMessage[] {
    const messages: LlmChatMessage[] = [];

    if (input.agentPrompt.trim()) {
      messages.push({
        role: 'system',
        content: input.agentPrompt.trim()
      });
    }

    if (input.agentMemorySummary?.trim()) {
      messages.push({
        role: 'system',
        content: `Memoria persistente do agente:\n${input.agentMemorySummary.trim()}`
      });
    }

    if (input.sessionMemorySummary?.trim()) {
      messages.push({
        role: 'system',
        content: `Memoria persistente da sessao:\n${input.sessionMemorySummary.trim()}`
      });
    }

    if (input.toolContext?.trim()) {
      messages.push({
        role: 'system',
        content: `Contexto de ferramentas:\n${input.toolContext.trim()}`
      });
    }

    return [...messages, ...input.history];
  }
}
