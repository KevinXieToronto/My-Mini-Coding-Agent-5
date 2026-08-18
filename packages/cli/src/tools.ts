import {
  ToolRegistry,
  readFileTool,
  runShellTool,
  writeFileTool,
} from '@mini-gemini/core';

export function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(runShellTool);
  return registry;
}
