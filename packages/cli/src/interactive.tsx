import { render } from 'ink';
import { App } from './ui/App.js';

export async function runInteractive(apiKey: string): Promise<void> {
  const { waitUntilExit } = render(<App apiKey={apiKey} />);
  await waitUntilExit();
}
