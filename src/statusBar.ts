import * as vscode from 'vscode';
import { StorageService } from './storage';

const MAX_STATUS_BAR_ITEMS = 5;

export class StatusBarManager {
  private _items: vscode.StatusBarItem[] = [];
  private _storage: StorageService;
  private _disposables: vscode.Disposable[] = [];

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

    // Show up to MAX_STATUS_BAR_ITEMS favorite prompts
    favorites.slice(0, MAX_STATUS_BAR_ITEMS).forEach((prompt, idx) => {
      const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        -(100 + idx)
      );

      // Truncate title for status bar
      const label =
        prompt.title.length > 20
          ? prompt.title.substring(0, 20) + '…'
          : prompt.title;

      item.text = `$(zap) ${label}`;
      item.tooltip = new vscode.MarkdownString(
        `**Quick Prompt:** ${prompt.title}\n\n---\n\`\`\`\n${prompt.content.substring(0, 200)}${prompt.content.length > 200 ? '…' : ''}\n\`\`\`\n\n_Click to inject into AI Chat_`
      );
      item.command = {
        command: 'quickPrompt.injectPromptById',
        title: 'Inject Prompt',
        arguments: [prompt.id],
      };
      item.show();
      this._items.push(item);
    });

    // "More" button if there are more than MAX
    if (favorites.length > MAX_STATUS_BAR_ITEMS) {
      const more = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        -(100 + MAX_STATUS_BAR_ITEMS)
      );
      more.text = `$(ellipsis) +${favorites.length - MAX_STATUS_BAR_ITEMS}`;
      more.tooltip = 'More favorite prompts — click to search all';
      more.command = 'quickPrompt.searchPrompts';
      more.show();
      this._items.push(more);
    }
  }

  dispose(): void {
    this._items.forEach((i) => i.dispose());
    this._disposables.forEach((d) => d.dispose());
  }
}
