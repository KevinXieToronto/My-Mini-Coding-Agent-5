import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolveInWorkspace } from './read-file.js';
import type { Tool } from './tool.js';

export const writeFileTool: Tool = {
  name: 'write_file',
  description:
    'Creates or overwrites a UTF-8 text file in the current project ' +
    'with the given content. Parent directories are created as needed.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path, relative to the project root.',
      },
      content: {
        type: 'string',
        description: 'The complete new content of the file.',
      },
    },
    required: ['path', 'content'],
  },
  async execute(args) {
    const path = resolveInWorkspace(String(args['path']));
    const content = String(args['content']);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf-8');
    return { output: `Wrote ${content.length} characters to ${path}.` };
  },
};
