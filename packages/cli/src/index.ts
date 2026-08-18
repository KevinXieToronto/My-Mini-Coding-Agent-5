function parseArgs(argv: string[]): {
  modelOverride?: string;
  prompt: string;
} {
  const rest: string[] = [];
  let modelOverride: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--model') {
      modelOverride = argv[++i];
    } else if (arg.startsWith('--model=')) {
      modelOverride = arg.slice('--model='.length);
    } else {
      rest.push(arg);
    }
  }
  return { modelOverride, prompt: rest.join(' ') };
}

const { modelOverride, prompt } = parseArgs(process.argv.slice(2));

const apiKey = process.env['OPENAI_API_KEY'];
if (!apiKey) {
  console.error(
    'OPENAI_API_KEY is not set. Run: set OPENAI_API_KEY=<your key>',
  );
  process.exit(1);
}

if (prompt) {
  const { runNonInteractive } = await import('./nonInteractive.js');
  await runNonInteractive(prompt, apiKey, modelOverride);
} else {
  const { runInteractive } = await import('./interactive.js');
  await runInteractive(apiKey, modelOverride);
}

const { shutdownMcp } = await import('./tools.js');
await shutdownMcp();
