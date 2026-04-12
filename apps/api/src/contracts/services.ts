export type LlmChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type StreamChatInput = {
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  onDelta: (delta: string) => void;
};

export type CompleteTextInput = {
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
};

export interface ModelGateway {
  streamChat(input: StreamChatInput): Promise<string>;
  completeText(input: CompleteTextInput): Promise<string>;
}

export interface ContextAssembler {
  assemble(input: {
    agentPrompt: string;
    agentMemorySummary: string | null;
    sessionMemorySummary: string | null;
    toolContext?: string | null;
    history: LlmChatMessage[];
  }): LlmChatMessage[];
}

export interface MemoryServiceContract {
  updateAfterTurn(input: {
    userId: string;
    agentId: string;
    sessionId: string;
    apiKey: string;
    updatedFromMessageId: string;
  }): Promise<void>;
}

export type ToolExecutionInput = {
  userId: string;
  agentId: string;
  ragEnabled: boolean;
  ragTopK: number;
  apiKey: string;
  prompt: string;
};

export type ToolExecutionOutput = {
  name: string;
  content: string;
};

export interface ChatTool {
  readonly name: string;
  canRun(input: ToolExecutionInput): boolean;
  run(input: ToolExecutionInput): Promise<ToolExecutionOutput | null>;
}

export interface ToolOrchestrator {
  execute(input: ToolExecutionInput): Promise<ToolExecutionOutput[]>;
}

export interface KnowledgeProvider {
  retrieve(): Promise<string[]>;
}

export class NoopToolOrchestrator implements ToolOrchestrator {
  public async execute(_input: ToolExecutionInput) {
    return [];
  }
}

export class NoopKnowledgeProvider implements KnowledgeProvider {
  public async retrieve() {
    return [];
  }
}
