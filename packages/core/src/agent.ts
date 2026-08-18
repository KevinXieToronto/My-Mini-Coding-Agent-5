import type { GeminiChat, ToolCall, ToolResponse } from './chat.js';
import type { ToolRegistry } from './tools/registry.js';

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'tool_result'; name: string; output: string; skipped: boolean };

/**
 * Asks the user whether a requested tool call may run.
 * The UI (readline today, Ink in Chapter 5) supplies this.
 */
export type ConfirmFn = (call: ToolCall) => Promise<boolean>;

/**
 * The agent loop: send a message, execute any requested tools (with
 * approval), feed results back, repeat until the model answers with
 * text only. Mirrors the turn loop + CoreToolScheduler in the real
 * project's packages/core/src/core and src/scheduler.
 */
export class Agent {
  constructor(
    private readonly chat: GeminiChat,
    private readonly registry: ToolRegistry,
    private readonly confirm: ConfirmFn,
  ) {}

  async *run(message: string): AsyncGenerator<AgentEvent> {
    let next: string | ToolResponse[] = message;

    for (;;) {
      const calls: ToolCall[] = [];
      for await (const event of this.chat.sendMessageStream(next)) {
        if (event.type === 'text') {
          yield { type: 'text', text: event.text };
        } else {
          calls.push(event.call);
          yield { type: 'tool_call', call: event.call };
        }
      }

      // No tool requests → the model is done with this task.
      if (calls.length === 0) {
        return;
      }

      const responses: ToolResponse[] = [];
      for (const call of calls) {
        const approved = await this.confirm(call);
        const output = approved
          ? await this.registry.execute(call.name, call.args)
          : 'The user denied permission to run this tool call.';
        yield {
          type: 'tool_result',
          name: call.name,
          output,
          skipped: !approved,
        };
        responses.push({ toolCallId: call.id, output });
      }
      next = responses;
    }
  }
}
