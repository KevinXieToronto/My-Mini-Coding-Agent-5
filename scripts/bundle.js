import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['packages/cli/src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'bundle/mini-gemini.js',
  // 一些 npm 依赖内部仍在使用 CommonJS 的 require()。
  // 这个 banner 在我们的 ESM 包里定义了 `require`，让它们能正常工作。
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
