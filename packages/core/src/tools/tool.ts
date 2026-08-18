import type OpenAI from 'openai';

export interface ToolResult {
  /** Human- and model-readable outcome of the execution. */
  output: string;
}

/**
 * A capability the model can invoke. The declaration half (name,
 * description, parameters) is sent to the model; the execute half
 * runs locally when the model asks for it.
 */
export interface Tool {
  name: string;
  description: string;
  /** Plain JSON Schema describing the arguments. */
  parameters: OpenAI.FunctionParameters;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export function toToolSchema(tool: Tool): OpenAI.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}
