import * as fs from 'fs';
import * as path from 'path';
import type { WorkflowState, AgentInfo, TaskInfo, StateReader } from './reader.js';

interface RawOmaState {
  mode?: string;
  active?: boolean;
  iteration?: number;
  task?: string;
  'hud-active'?: boolean;
  [key: string]: unknown;
}

export class OmaStateAdapter implements StateReader {
  constructor(private readonly workspaceRoot: string) {}

  private get omaDir(): string {
    return path.join(this.workspaceRoot, '.oma');
  }

  private readStateFile(): RawOmaState | null {
    const stateFile = path.join(this.omaDir, 'state.json');
    try {
      if (!fs.existsSync(stateFile)) return null;
      return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as RawOmaState;
    } catch {
      return null;
    }
  }

  getWorkflows(): WorkflowState[] {
    const raw = this.readStateFile();
    if (!raw) return [];
    return [
      {
        id: 'main',
        mode: raw.mode ?? 'none',
        active: raw.active ?? false,
        iteration: raw.iteration,
        task: raw.task,
      },
    ];
  }

  getAgents(): AgentInfo[] {
    // oh-my-auggie does not expose agent tracking in a local JSON file
    return [];
  }

  getTasks(): TaskInfo[] {
    // Task tracking is via Claude Code native tools, not a local JSON file
    return [];
  }
}
