import { createInterface } from 'node:readline/promises';
import {
  Agent,
  GeminiChat,
  ToolRegistry,
  readFileTool,
  runShellTool,
  writeFileTool,
  type ToolCall,
} from '@mini-gemini/core';

const prompt = process.argv.slice(2).join(' ');
if (!prompt) {
  console.error('Usage: mini-gemini "<your prompt>"');
  process.exit(1);
}

const apiKey = process.env['OPENAI_API_KEY'];
if (!apiKey) {
  console.error(
    'OPENAI_API_KEY is not set. Run: set OPENAI_API_KEY=<your key>',
  );
  process.exit(1);
}

const registry = new ToolRegistry();
registry.register(readFileTool);
registry.register(writeFileTool);
registry.register(runShellTool);

const rl = createInterface({ input: process.stdin, output: process.stdout });
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
      // The approval prompt itself is printed by `confirm`.
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
