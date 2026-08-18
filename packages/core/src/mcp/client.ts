import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type OpenAI from 'openai';
import type { ToolRegistry } from '../tools/registry.js';
import type { Tool, ToolResult } from '../tools/tool.js';

/** How to launch one stdio MCP server (from settings.json). */
export interface McpServerConfig {
  command: string;
  args?: string[];
}

/**
 * Launches an MCP server, discovers its tools, and registers each one
 * in the ToolRegistry under the name `mcp__<server>__<tool>` — the
 * same convention as the real project's mcp-tool.ts. Returns the
 * connected client so the caller can close it on shutdown.
 */
export async function connectMcpServer(
  registry: ToolRegistry,
  serverName: string,
  config: McpServerConfig,
): Promise<Client> {
  const client = new Client({ name: 'mini-gemini', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args ?? [],
  });
  await client.connect(transport);

  const { tools } = await client.listTools();
  for (const mcpTool of tools) {
    const tool: Tool = {
      name: `mcp__${serverName}__${mcpTool.name}`,
      description:
        mcpTool.description ??
        `Tool "${mcpTool.name}" from MCP server "${serverName}".`,
      // MCP tools already describe themselves in JSON Schema, and that
      // is exactly what OpenAI's `parameters` field wants — no
      // conversion, just a cast from the SDK's own schema type.
      parameters: (mcpTool.inputSchema ?? {
        type: 'object',
        properties: {},
      }) as OpenAI.FunctionParameters,
      async execute(args): Promise<ToolResult> {
        const result = await client.callTool({
          name: mcpTool.name,
          arguments: args,
        });
        const content = (result.content ?? []) as Array<{
          type: string;
          text?: string;
        }>;
        const text = content
          .filter((part) => part.type === 'text' && part.text)
          .map((part) => part.text)
          .join('\n');
        return { output: text || JSON.stringify(content) };
      },
    };
    registry.register(tool);
  }
  return client;
}
