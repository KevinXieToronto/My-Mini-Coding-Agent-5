import {
  connectMcpServer,
  readFileTool,
  runShellTool,
  ToolRegistry,
  writeFileTool,
} from '@mini-gemini/core';
import { loadSettings } from './settings.js';

const mcpClients: Array<{ close(): Promise<void> }> = [];

export async function buildRegistry(): Promise<ToolRegistry> {
  const registry = new ToolRegistry();
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(runShellTool);

  const settings = await loadSettings();
  for (const [name, config] of Object.entries(settings.mcpServers ?? {})) {
    try {
      mcpClients.push(await connectMcpServer(registry, name, config));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Warning: MCP server "${name}" failed to start: ${message}`);
    }
  }
  return registry;
}

/** Kills the MCP server child processes so the CLI can exit. */
export async function shutdownMcp(): Promise<void> {
  await Promise.all(mcpClients.map((client) => client.close()));
}
