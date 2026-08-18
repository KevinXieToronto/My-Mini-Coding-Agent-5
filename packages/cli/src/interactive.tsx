import { render } from 'ink';
import { buildRegistry } from './tools.js';
import { App } from './ui/App.js';

export async function runInteractive(apiKey: string): Promise<void> {
  const registry = await buildRegistry();
  const { waitUntilExit } = render(<App apiKey={apiKey} registry={registry} />);
  await waitUntilExit();
}
