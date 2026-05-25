// plugins/oma/src/cli/team.ts — Worker team management for OMA CLI
// Ported from cli/commands/team.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWrite, isPidAlive, listWorkerDirs, nextWorkerId, readJsonSafe, resolveOmaDir, resolveInOmaDir } from './utils.js';
// ── Detect stale workers ──────────────────────────────────────────────────
export function detectStaleWorkers(teamDir) {
    if (!existsSync(teamDir))
        return [];
    return listWorkerDirs(teamDir)
        .map(dir => {
        const meta = readJsonSafe(join(dir, 'meta.json'), {});
        return { dir, pid: meta?.pid ?? 0 };
    })
        .filter(({ pid }) => pid > 0 && !isPidAlive(pid))
        .map(({ dir }) => Number.parseInt(dir.split('/worker-').pop() || '0', 10));
}
// ── Spawn ─────────────────────────────────────────────────────────────────
export async function teamSpawn(N, task, opts = {}) {
    const omaDir = opts.omaDir || resolveOmaDir();
    const teamDir = resolveInOmaDir('team');
    const wrapperPath = resolveInOmaDir('workers/wrapper.mjs');
    // Check for stale workers
    const stale = detectStaleWorkers(teamDir);
    if (stale.length > 0 && !opts.force) {
        process.stderr.write(`worker(s) ${stale.join(', ')} appear stale. Use --force to override or 'team shutdown --stale' to clean.\n`);
        process.exit(1);
    }
    if (stale.length > 0) {
        for (const id of stale) {
            const dir = join(teamDir, `worker-${id}`);
            if (existsSync(dir))
                unlinkSync(dir);
        }
    }
    for (let i = 0; i < N; i++) {
        const workerId = nextWorkerId(teamDir);
        const workerDir = resolveInOmaDir(`team/worker-${workerId}`);
        mkdirSync(workerDir, { recursive: true });
        writeFileSync(join(workerDir, 'meta.json'), JSON.stringify({ worker_id: workerId, pid: 0, spawned_at: new Date().toISOString() }, null, 2));
        writeFileSync(join(workerDir, 'status.json'), JSON.stringify({ status: 'starting' }, null, 2));
        writeFileSync(join(workerDir, 'task.txt'), task);
        // Fork worker process
        const worker = spawnSync(process.execPath, [wrapperPath, '--id', String(workerId), '--oma-dir', omaDir, '--task', task], {
            cwd: process.cwd(),
            stdio: 'ignore',
        });
        if (worker.status !== 0) {
            atomicWrite(join(workerDir, 'status.json'), { status: 'error', error: `spawn failed: ${worker.stderr?.toString() || ''}` });
        }
        else {
            atomicWrite(join(workerDir, 'meta.json'), { worker_id: workerId, pid: worker.pid, spawned_at: new Date().toISOString() });
            atomicWrite(join(workerDir, 'status.json'), { status: 'running' });
        }
    }
    process.stdout.write(`oma team: spawned ${N} workers.\n`);
}
// ── Status ────────────────────────────────────────────────────────────────
export async function teamStatus(opts = {}) {
    const omaDir = opts.omaDir || resolveOmaDir();
    const teamDir = resolveInOmaDir('team');
    const workers = listWorkerDirs(teamDir).map(dir => {
        const id = Number.parseInt(dir.split('/worker-').pop() || '0', 10);
        const meta = readJsonSafe(join(dir, 'meta.json'), {});
        const status = readJsonSafe(join(dir, 'status.json'), {});
        return { id, pid: meta?.pid ?? 0, status: status?.status ?? 'unknown', alive: isPidAlive(meta?.pid ?? 0) };
    });
    if (opts.json) {
        process.stdout.write(JSON.stringify({ ok: true, workers }, null, 2) + '\n');
    }
    else {
        if (workers.length === 0) {
            process.stdout.write('oma team: no workers\n');
            return true;
        }
        for (const w of workers) {
            process.stdout.write(`worker-${w.id}: pid=${w.pid} status=${w.status} alive=${w.alive}\n`);
        }
    }
    return workers.length > 0 && workers.every(w => w.status === 'done' || w.status === 'error');
}
// ── Shutdown ──────────────────────────────────────────────────────────────
export async function teamShutdown(opts = {}) {
    const omaDir = opts.omaDir || resolveOmaDir();
    const teamDir = resolveInOmaDir('team');
    const workers = listWorkerDirs(teamDir).map(dir => {
        const id = Number.parseInt(dir.split('/worker-').pop() || '0', 10);
        const meta = readJsonSafe(join(dir, 'meta.json'), {});
        return { id, dir, pid: meta?.pid ?? 0 };
    });
    if (workers.length === 0) {
        process.stdout.write('oma team: no workers to shut down\n');
        return true;
    }
    for (const worker of workers) {
        const isStale = worker.pid > 0 && !isPidAlive(worker.pid);
        if (opts.stale && !isStale)
            continue;
        if (isStale) {
            process.stdout.write(`worker-${worker.id}: already dead, cleaning up\n`);
        }
        else if (worker.pid > 0) {
            try {
                process.kill(worker.pid, 'SIGTERM');
            }
            catch { /* ignore */ }
            process.stdout.write(`worker-${worker.id}: SIGTERM sent\n`);
        }
        try {
            atomicWrite(join(worker.dir, 'status.json'), { status: 'shutdown' });
        }
        catch { /* ignore */ }
    }
    return true;
}
