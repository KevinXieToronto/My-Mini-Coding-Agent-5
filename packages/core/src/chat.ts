import OpenAI from 'openai';
import type { ModelRouter, RoutingDecision } from './routing/router.js';
import { createDefaultRouter, FAST_MODEL } from './routing/strategies.js';
import type { ToolRegistry } from './tools/registry.js';

export const DEFAULT_MODEL = FAST_MODEL;

/** 对话中的一条记录，采用 OpenAI 的传输格式。 */
export type ChatMessage = OpenAI.ChatCompletionMessageParam;

/** 模型请求的一次工具调用，参数已完成解析。 */
export interface ToolCall {
  /** API 为这次调用分配的 id——工具结果必须原样带回它。 */
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** 一次工具调用被执行（或被拒绝）后的结果。 */
export interface ToolResponse {
  toolCallId: string;
  output: string;
}

/** 一个流式事件：文本、一次工具调用请求，或一次路由决定。 */
export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_request'; call: ToolCall }
  | { type: 'routing'; decision: RoutingDecision };

/**
 * 负责与 OpenAI API 的一次对话：保存各轮次的历史记录，
 * 通过路由器为每条用户消息挑选模型，并流式输出响应。
 */
export class GeminiChat {
  private readonly client: OpenAI;
  private readonly history: ChatMessage[] = [];
  private currentModel: string = DEFAULT_MODEL;

  constructor(
    apiKey: string,
    private readonly registry?: ToolRegistry,
    private readonly router: ModelRouter = createDefaultRouter(),
  ) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * 发送一个轮次——可以是用户文本消息，也可以是一批工具
   * 结果——并以事件流的形式产出模型的回复。
   */
  async *sendMessageStream(
    message: string | ToolResponse[],
  ): AsyncGenerator<ChatEvent> {
    // 只在全新的用户消息上路由；工具结果轮次继续沿用
    // 开启该任务的那个模型。
    if (typeof message === 'string') {
      const decision = await this.router.route({
        prompt: message,
        historyLength: this.history.length,
      });
      this.currentModel = decision.model;
      yield { type: 'routing', decision };
    }

    if (typeof message === 'string') {
      this.history.push({ role: 'user', content: message });
    } else {
      for (const response of message) {
        this.history.push({
          role: 'tool',
          tool_call_id: response.toolCallId,
          content: response.output,
        });
      }
    }

    const tools = this.registry?.getToolSchemas() ?? [];
    const stream = await this.client.chat.completions.create({
      model: this.currentModel,
      messages: this.history,
      stream: true,
      ...(tools.length > 0 ? { tools } : {}),
    });

    let fullText = '';
    const partial = new Map<
      number,
      { id: string; name: string; args: string }
    >();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) {
        continue;
      }
      if (delta.content) {
        fullText += delta.content;
        yield { type: 'text', text: delta.content };
      }
      for (const fragment of delta.tool_calls ?? []) {
        const entry = partial.get(fragment.index) ?? {
          id: '',
          name: '',
          args: '',
        };
        if (fragment.id) {
          entry.id = fragment.id;
        }
        if (fragment.function?.name) {
          entry.name += fragment.function.name;
        }
        if (fragment.function?.arguments) {
          entry.args += fragment.function.arguments;
        }
        partial.set(fragment.index, entry);
      }
    }

    const calls: ToolCall[] = [];
    for (const entry of partial.values()) {
      let args: Record<string, unknown> = {};
      try {
        args = entry.args
          ? (JSON.parse(entry.args) as Record<string, unknown>)
          : {};
      } catch {
        args = {};
      }
      calls.push({ id: entry.id, name: entry.name, args });
    }

    this.history.push({
      role: 'assistant',
      content: fullText || null,
      ...(calls.length > 0
        ? {
            tool_calls: calls.map((call) => ({
              id: call.id,
              type: 'function' as const,
              function: {
                name: call.name,
                arguments: JSON.stringify(call.args),
              },
            })),
          }
        : {}),
    });

    for (const call of calls) {
      yield { type: 'tool_request', call };
    }
  }

  getHistory(): readonly ChatMessage[] {
    return this.history;
  }
}
