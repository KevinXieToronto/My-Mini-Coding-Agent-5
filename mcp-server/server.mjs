import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'dice', version: '1.0.0' });

server.registerTool(
  'roll_dice',
  {
    description: 'Rolls one or more dice and returns each result.',
    inputSchema: {
      sides: z
        .number()
        .int()
        .min(2)
        .describe('Number of sides per die, e.g. 6 or 20.'),
      count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .describe('How many dice to roll.'),
    },
  },
  async ({ sides, count }) => {
    const rolls = Array.from(
      { length: count },
      () => 1 + Math.floor(Math.random() * sides),
    );
    return {
      content: [
        {
          type: 'text',
          text: `Rolled ${count}d${sides}: ${rolls.join(', ')} (total ${rolls.reduce((a, b) => a + b, 0)})`,
        },
      ],
    };
  },
);

// IMPORTANT: never console.log in a stdio MCP server — stdout *is* the
// protocol channel. Use console.error for diagnostics.
await server.connect(new StdioServerTransport());
console.error('[dice] MCP server ready');
