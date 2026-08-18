import { GeminiChat } from '@mini-gemini/core';

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

const chat = new GeminiChat(apiKey);
for await (const text of chat.sendMessageStream(prompt)) {
  process.stdout.write(text);
}
process.stdout.write('\n');
