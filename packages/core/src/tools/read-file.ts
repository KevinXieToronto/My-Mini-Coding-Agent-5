import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { truncate } from '../utils/text.js';
import type { Tool } from './tool.js';

/** Resolves a path and refuses to escape the working directory. */
export function resolveInWorkspace(relativePath: string): string {
  const root = process.cwd();
  const resolved = resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`Path "${relativePath}" is outside the workspace.`);
  }
  return resolved;
}

export const readFileTool: Tool = {
  name: 'read_file',
  description:
    'Reads a UTF-8 text file from the current project and returns its ' +
    'contents. Use this before modifying any existing file.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path, relative to the project root.',
      },
    },
    required: ['path'],
  },
  async execute(args) {
    const path = resolveInWorkspace(String(args['path']));
    const content = await readFile(path, 'utf-8');
    return { output: truncate(content) };
  },
};
