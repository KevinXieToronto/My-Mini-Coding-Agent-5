import OpenAI from 'openai';

export const DEFAULT_MODEL = 'gpt-4o-mini';

/** One entry in the conversation, in the OpenAI wire format. */
export type ChatMessage = OpenAI.ChatCompletionMessageParam;

/**
 * Owns a conversation with the OpenAI API: keeps the history of turns
 * and streams each model response.
 *
 * Mirrors GeminiChat in the real project
 * (packages/core/src/core/geminiChat.ts).
 */
export class GeminiChat {
  private readonly client: OpenAI;
  private readonly history: ChatMessage[] = [];

  constructor(
    apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Sends a user message and yields the model's reply as a stream of
   * text fragments. The full exchange is recorded in `history`, so the
   * next call has the whole conversation as context.
   */
  async *sendMessageStream(message: string): AsyncGenerator<string> {
    this.history.push({ role: 'user', content: message });

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: this.history,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        fullText += text;
        yield text;
      }
    }

    this.history.push({ role: 'assistant', content: fullText });
  }

  getHistory(): readonly ChatMessage[] {
    return this.history;
  }
}
