import type { ChatTool, ToolExecutionInput, ToolExecutionOutput, ToolOrchestrator } from '../contracts/services.js';

export class ToolOrchestratorService implements ToolOrchestrator {
  public constructor(private readonly tools: ChatTool[]) {}

  public async execute(input: ToolExecutionInput): Promise<ToolExecutionOutput[]> {
    console.info('[TOOLS] Execution started', {
      userId: input.userId,
      agentId: input.agentId,
      availableTools: this.tools.map((tool) => tool.name)
    });

    const results: ToolExecutionOutput[] = [];

    for (const tool of this.tools) {
      if (!tool.canRun(input)) {
        console.info('[TOOLS] Tool skipped', { tool: tool.name });
        continue;
      }

      console.info('[TOOLS] Tool running', { tool: tool.name });

      const result = await tool.run(input);

      if (result) {
        results.push(result);
        console.info('[TOOLS] Tool returned context', {
          tool: tool.name,
          chars: result.content.length
        });
      } else {
        console.info('[TOOLS] Tool returned empty result', { tool: tool.name });
      }
    }

    console.info('[TOOLS] Execution finished', {
      userId: input.userId,
      agentId: input.agentId,
      results: results.map((result) => result.name)
    });

    return results;
  }
}
