import { createInterface } from 'node:readline/promises';
import { Agent, GeminiChat, type ToolCall } from '@mini-gemini/core';
import { buildRegistry } from './tools.js';

export async function runNonInteractive(
  prompt: string,
  apiKey: string,
): Promise<void> {
  const registry = buildRegistry();
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const confirm = async (call: ToolCall) => {
    const answer = await rl.question(
      `\nAllow ${call.name}(${JSON.stringify(call.args)})? [y/N] `,
    );
    return answer.trim().toLowerCase() === 'y';
  };

  const chat = new GeminiChat(apiKey, registry);
  const agent = new Agent(chat, registry, confirm);

  for await (const event of agent.run(prompt)) {
    switch (event.type) {
      case 'text':
        process.stdout.write(event.text);
        break;
      case 'tool_call':
        break;
      case 'tool_result':
        console.log(
          event.skipped
            ? `[skipped] ${event.name}`
            : `[${event.name}] ${event.output.split('\n')[0]}`,
        );
        break;
    }
  }
  rl.close();
  process.stdout.write('\n');
}
