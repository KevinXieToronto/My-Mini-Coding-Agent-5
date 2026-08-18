import { createInterface } from 'node:readline/promises';
import {
  Agent,
  createDefaultRouter,
  GeminiChat,
  type ToolCall,
} from '@mini-gemini/core';
import { buildRegistry } from './tools.js';

export async function runNonInteractive(
  prompt: string,
  apiKey: string,
  modelOverride?: string,
): Promise<void> {
  const registry = await buildRegistry();
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

  const router = createDefaultRouter(modelOverride);
  const chat = new GeminiChat(apiKey, registry, router);
  const agent = new Agent(chat, registry, confirm);

  for await (const event of agent.run(prompt)) {
    switch (event.type) {
      case 'text':
        process.stdout.write(event.text);
        break;
      case 'routing':
        console.log(
          `[router] ${event.decision.model} — ${event.decision.source}: ${event.decision.reason}`,
        );
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
