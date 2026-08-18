import OpenAI from 'openai';
import type { ToolRegistry } from './tools/registry.js';

export const DEFAULT_MODEL = 'gpt-4o-mini';

/** One entry in the conversation, in the OpenAI wire format. */
export type ChatMessage = OpenAI.ChatCompletionMessageParam;

/** A tool call the model asked for, with arguments already parsed. */
export interface ToolCall {
  /** The API's id for this call — the tool result must quote it back. */
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** The outcome of one executed (or refused) tool call. */
export interface ToolResponse {
  toolCallId: string;
  output: string;
}

/** One streamed event: a text fragment or a tool-call request. */
export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_request'; call: ToolCall };

/**
 * Owns a conversation with the OpenAI API: keeps the history of turns
 * and streams each model response.
 */
export class GeminiChat {
  private readonly client: OpenAI;
  private readonly history: ChatMessage[] = [];

  constructor(
    apiKey: string,
    private readonly registry?: ToolRegistry,
    private readonly model: string = DEFAULT_MODEL,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Sends one turn — either a user text message or a batch of tool
   * results — and yields the model's reply as a stream of events.
   */
  async *sendMessageStream(
    message: string | ToolResponse[],
  ): AsyncGenerator<ChatEvent> {
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
      model: this.model,
      messages: this.history,
      stream: true,
      ...(tools.length > 0 ? { tools } : {}),
    });

    let fullText = '';
    // Tool calls stream in fragments, keyed by their position in the
    // response; we reassemble them here.
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
        // Malformed JSON is rare but possible; an empty object still
        // lets the tool report a useful error back to the model.
        args = {};
      }
      calls.push({ id: entry.id, name: entry.name, args });
    }

    // Record the model turn faithfully — including its tool_calls. If
    // we dropped them, the model would see a history where it never
    // asked for the tool, and the conversation would derail.
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
