import {
  GeminiChat,
  ToolRegistry,
  readFileTool,
  runShellTool,
  writeFileTool,
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

const chat = new GeminiChat(apiKey, registry);
for await (const event of chat.sendMessageStream(prompt)) {
  if (event.type === 'text') {
    process.stdout.write(event.text);
  } else {
    console.log(
      `\n[tool request] ${event.call.name}(${JSON.stringify(event.call.args)})` +
        ' — not executed yet (that is Chapter 4!)',
    );
  }
}
process.stdout.write('\n');
