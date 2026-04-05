import { spawn } from 'child_process';
import { join } from 'path';
import { readFileSync } from 'fs';

export interface ParityResult {
  hookName: string;
  shellExitCode: number;
  mjsExitCode: number;
  shellStderr: string;
  mjsStderr: string;
  matched: boolean;
}

/**
 * Runs a hook's shell script and compiled .mjs side-by-side with identical input,
 * returning exit codes and stderr for comparison.
 */
export function runParity(
  hookName: string,
  stdinPayload: string,
  omaDir: string
): Promise<ParityResult> {
  const hooksDir = join(omaDir, 'hooks');
  const shellPath = join(hooksDir, `${hookName}.sh`);
  const mjsPath = join(hooksDir, `${hookName}.mjs`);

  return Promise.all([
    runSingle(shellPath, stdinPayload),
    runSingle('node', [mjsPath], stdinPayload),
  ]).then(([shell, mjs]) => ({
    hookName,
    shellExitCode: shell.exitCode,
    mjsExitCode: mjs.exitCode,
    shellStderr: shell.stderr,
    mjsStderr: mjs.stderr,
    matched: shell.exitCode === mjs.exitCode && shell.stderr === mjs.stderr,
  }));
}

function runSingle(
  cmd: string,
  args: string[],
  stdin: string
): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { shell: true });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (exitCode) => resolve({ exitCode: exitCode ?? 0, stderr }));
    proc.stdin.write(stdin);
    proc.stdin.end();
  });
}
