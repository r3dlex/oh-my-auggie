import * as vscode from 'vscode';
import type { StateReader, WorkflowState, AgentInfo, TaskInfo } from '../state/reader.js';

// ─── WorkflowTreeProvider ────────────────────────────────────────────────────

export class WorkflowTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _debounceTimer: NodeJS.Timeout | undefined;

  constructor(private readonly reader: StateReader) {}

  refresh(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._onDidChangeTreeData.fire(undefined);
    }, 200);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const workflows = this.reader.getWorkflows();
    if (workflows.length === 0) {
      const empty = new vscode.TreeItem('No active workflows');
      empty.description = 'Start an OMA mode to see state';
      return [empty];
    }
    return workflows.map((w) => workflowToItem(w));
  }
}

function workflowToItem(w: WorkflowState): vscode.TreeItem {
  const label = `${w.mode}`;
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
  const statusText = w.active ? 'active' : 'stopped';
  const iterText = w.iteration !== undefined ? ` · iter ${w.iteration}` : '';
  const taskText = w.task ? ` · ${w.task.slice(0, 40)}` : '';
  item.description = `${statusText}${iterText}${taskText}`;
  item.iconPath = w.active
    ? new vscode.ThemeIcon('sync~spin')
    : new vscode.ThemeIcon('circle-outline');
  return item;
}

// ─── AgentTreeProvider ───────────────────────────────────────────────────────

export class AgentTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _debounceTimer: NodeJS.Timeout | undefined;

  constructor(private readonly reader: StateReader) {}

  refresh(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._onDidChangeTreeData.fire(undefined);
    }, 200);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const agents = this.reader.getAgents();
    if (agents.length === 0) {
      const item = new vscode.TreeItem('No agent data available');
      item.description = 'oh-my-auggie does not expose agent tracking locally';
      return [item];
    }
    return agents.map((a) => agentToItem(a));
  }
}

function agentToItem(a: AgentInfo): vscode.TreeItem {
  const item = new vscode.TreeItem(a.id, vscode.TreeItemCollapsibleState.None);
  item.description = `${a.type} · ${a.status}`;
  return item;
}

// ─── TaskTreeProvider ────────────────────────────────────────────────────────

export class TaskTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _debounceTimer: NodeJS.Timeout | undefined;

  constructor(private readonly reader: StateReader) {}

  refresh(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._onDidChangeTreeData.fire(undefined);
    }, 200);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const tasks = this.reader.getTasks();
    if (tasks.length === 0) {
      const item = new vscode.TreeItem('No task data available');
      item.description = 'Task tracking is via Claude Code native tools';
      return [item];
    }
    return tasks.map((t) => taskToItem(t));
  }
}

function taskToItem(t: TaskInfo): vscode.TreeItem {
  const item = new vscode.TreeItem(t.subject, vscode.TreeItemCollapsibleState.None);
  item.description = t.status + (t.owner ? ` · ${t.owner}` : '');
  return item;
}
