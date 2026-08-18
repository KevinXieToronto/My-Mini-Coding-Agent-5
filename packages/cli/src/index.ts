const args = process.argv.slice(2);

const apiKey = process.env['OPENAI_API_KEY'];
if (!apiKey) {
  console.error(
    'OPENAI_API_KEY is not set. Run: set OPENAI_API_KEY=<your key>',
  );
  process.exit(1);
}

if (args.length > 0) {
  const { runNonInteractive } = await import('./nonInteractive.js');
  await runNonInteractive(args.join(' '), apiKey);
} else {
  const { runInteractive } = await import('./interactive.js');
  await runInteractive(apiKey);
}
