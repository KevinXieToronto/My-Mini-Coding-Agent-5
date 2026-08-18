import type { GeminiChat, ToolCall, ToolResponse } from './chat.js';
import type { RoutingDecision } from './routing/router.js';
import type { ToolRegistry } from './tools/registry.js';

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'tool_result'; name: string; output: string; skipped: boolean }
  | { type: 'routing'; decision: RoutingDecision };

/**
 * 询问用户是否允许运行某次被请求的工具调用。
 */
export type ConfirmFn = (call: ToolCall) => Promise<boolean>;

/**
 * 代理循环：发送消息，执行被请求的工具（需批准），把结果
 * 反馈回去，重复此过程，直到模型只用文本作答。
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
        } else if (event.type === 'routing') {
          yield { type: 'routing', decision: event.decision };
        } else {
          calls.push(event.call);
          yield { type: 'tool_call', call: event.call };
        }
      }

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
