import type OpenAI from 'openai';
import { toToolSchema, type Tool } from './tool.js';

/**
 * Holds every tool the agent may use, keyed by name.
 * Mirrors ToolRegistry in packages/core/src/tools/tool-registry.ts.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** The schemas we advertise to the model with every request. */
  getToolSchemas(): OpenAI.ChatCompletionTool[] {
    return [...this.tools.values()].map(toToolSchema);
  }

  /** Runs a tool by name; used by the agent loop in Chapter 4. */
  async execute(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `Error: unknown tool "${name}".`;
    }
    try {
      const result = await tool.execute(args);
      return result.output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error: ${message}`;
    }
  }
}
