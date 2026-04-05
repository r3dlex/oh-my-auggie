import { join } from 'path';
import { execa, type ExecaChildProcess } from 'execa';

export interface SpawnHookOptions {
  hookName: string;
  stdinPayload: string;
  omaDir: string;
}

/**
 * Spawns the compiled .mjs hook as a subprocess using execa.
 * Returns the ExecaChildProcess for assertions on exit code and output.
 */
export function spawnHook({
  hookName,
  stdinPayload,
  omaDir,
}: SpawnHookOptions): ExecaChildProcess<string> {
  const hookPath = join(omaDir, 'hooks', `${hookName}.mjs`);
  return execa('node', [hookPath], {
    input: stdinPayload,
    all: true,
    reject: false,
  });
}
