import { createDefaultRouter } from '@mini-gemini/core';
import { render } from 'ink';
import { buildRegistry } from './tools.js';
import { App } from './ui/App.js';

export async function runInteractive(
  apiKey: string,
  modelOverride?: string,
): Promise<void> {
  const registry = await buildRegistry();
  const router = createDefaultRouter(modelOverride);
  const { waitUntilExit } = render(
    <App apiKey={apiKey} registry={registry} router={router} />,
  );
  await waitUntilExit();
}
