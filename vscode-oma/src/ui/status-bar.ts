import * as vscode from 'vscode';
import type { StateReader } from '../state/reader.js';

export class OmaStatusBar {
  private readonly item: vscode.StatusBarItem;
  private _debounceTimer: NodeJS.Timeout | undefined;

  constructor(private readonly reader: StateReader) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'oma.showStatus';
    this.update();
    this.item.show();
  }

  refresh(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.update();
    }, 200);
  }

  private update(): void {
    const workflows = this.reader.getWorkflows();
    const active = workflows.find((w) => w.active);
    if (active) {
      this.item.text = `$(sync~spin) OMA: ${active.mode} active`;
      this.item.tooltip = `oh-my-auggie — mode: ${active.mode}, iteration: ${active.iteration ?? 'n/a'}`;
    } else {
      this.item.text = `$(zap) OMA: idle`;
      this.item.tooltip = 'oh-my-auggie — no active workflow';
    }
  }

  dispose(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this.item.dispose();
  }
}
