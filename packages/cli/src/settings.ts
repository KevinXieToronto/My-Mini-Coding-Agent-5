import { readFile } from 'node:fs/promises';
import type { McpServerConfig } from '@mini-gemini/core';

export interface Settings {
  mcpServers?: Record<string, McpServerConfig>;
}

/** Reads .mini-gemini/settings.json from the working directory. */
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await readFile('.mini-gemini/settings.json', 'utf-8');
    return JSON.parse(raw) as Settings;
  } catch {
    return {}; // no settings file is fine — MCP is optional
  }
}
