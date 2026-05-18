import * as vscode from 'vscode';
import { StorageService } from './storage';
import { injectPrompt } from './actions';

// No artificial limit — all favorites are shown in the status bar

export class StatusBarManager {
  private _items: vscode.StatusBarItem[] = [];
  private _storage: StorageService;
  private _disposables: vscode.Disposable[] = [];
  private _dynamicCommandDisposables: vscode.Disposable[] = [];

    constructor(storage: StorageService) {
      this._storage = storage;
      // Re-render whenever data changes
      this._disposables.push(storage.onDidChange(() => this._sync()));
      // Re-render if configuration (enable/disable) changes
      this._disposables.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('quickPrompt.enabled')) this._sync();
      }));
      this._sync();
    }
  
    private _sync(): void {
      // Dispose old items
      this._items.forEach((i) => i.dispose());
      this._items = [];

      // Dispose old dynamic commands
      this._dynamicCommandDisposables.forEach((d) => d.dispose());
      this._dynamicCommandDisposables = [];
  
      // Check if extension is enabled
      const isEnabled = vscode.workspace.getConfiguration('quickPrompt').get<boolean>('enabled', true);
      if (!isEnabled) return;
  
      const favorites = this._storage.getFavoritePrompts();

    if (favorites.length === 0) {
      // Show a placeholder when there are no favorites
      const placeholder = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        -100
      );
      placeholder.text = '$(star) Quick Prompts';
      placeholder.tooltip = 'No favorites yet — star a prompt to pin it here!';
      placeholder.command = 'quickPrompt.openWebview';
      placeholder.backgroundColor = undefined;
      placeholder.show();
      this._items.push(placeholder);
      return;
    }

    // Show ALL favorite prompts in the status bar (no cap)
    favorites.forEach((prompt, idx) => {
      const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        -(100 + idx)
      );

      // Shrink label based on how many favorites exist for density
      const maxLen = favorites.length > 8 ? 12 : favorites.length > 5 ? 16 : 20;
      const label =
        prompt.title.length > maxLen
          ? prompt.title.substring(0, maxLen) + '…'
          : prompt.title;

      item.text = `$(zap) ${label}`;
      item.tooltip = new vscode.MarkdownString(
        `**Quick Prompt:** ${prompt.title}\n\n---\n\`\`\`\n${prompt.content.substring(0, 200)}${prompt.content.length > 200 ? '…' : ''}\n\`\`\`\n\n_Click to inject into AI Chat_`
      );

      // Dynamically register a command for each favorite status bar prompt to bypass
      // the VS Code status bar command argument limitation natively and robustly.
      const cmdId = `quickPrompt.statusBarInject.${prompt.id}`;
      const disposable = vscode.commands.registerCommand(cmdId, async () => {
        const enabled = vscode.workspace.getConfiguration('quickPrompt').get<boolean>('enabled', true);
        if (!enabled) {
          vscode.window.showWarningMessage('⚡ Quick Prompt is currently disabled. Re-enable it from the Dashboard to use this feature.');
          return;
        }
        await this._storage.incrementUseCount(prompt.id);
        await injectPrompt(prompt, this._storage);
      });
      this._dynamicCommandDisposables.push(disposable);

      item.command = cmdId;
      item.show();
      this._items.push(item);
    });
  }

  dispose(): void {
    this._items.forEach((i) => i.dispose());
    this._dynamicCommandDisposables.forEach((d) => d.dispose());
    this._disposables.forEach((d) => d.dispose());
  }
}
