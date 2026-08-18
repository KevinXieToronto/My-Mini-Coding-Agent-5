import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { truncate } from '../utils/text.js';
import type { Tool } from './tool.js';

const execAsync = promisify(exec);

export const runShellTool: Tool = {
  name: 'run_shell',
  description:
    'Executes a shell command in the project root and returns stdout, ' +
    'stderr, and the exit code. On Windows the command runs under ' +
    'cmd.exe; on Linux/macOS under /bin/sh.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The exact command line to execute.',
      },
    },
    required: ['command'],
  },
  async execute(args) {
    const command = String(args['command']);
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 30_000,
      });
      return {
        output: truncate(
          `exit code: 0\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ),
      };
    } catch (error) {
      // exec rejects on non-zero exit; that's still useful model feedback.
      const e = error as { code?: number; stdout?: string; stderr?: string };
      return {
        output: truncate(
          `exit code: ${e.code ?? 'unknown'}\nstdout:\n${e.stdout ?? ''}\nstderr:\n${e.stderr ?? ''}`,
        ),
      };
    }
  },
};
