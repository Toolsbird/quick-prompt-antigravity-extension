import * as vscode from 'vscode';
import { StorageService } from './storage';
import { QuickPromptTreeProvider } from './treeProvider';
import { StatusBarManager } from './statusBar';
import { WebviewManager } from './webview';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext): void {
  console.log('[Quick Prompt] Extension activated');

  // 1. Storage
  const storage = new StorageService(context);

  // 2. Tree View (Sidebar)
  const treeProvider = new QuickPromptTreeProvider(storage);
  const treeView = vscode.window.createTreeView('quickPromptExplorer', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
    canSelectMany: false,
  });

  // 3. Status Bar
  const statusBarManager = new StatusBarManager(storage);

  // 4. Webview Manager
  const webviewManager = new WebviewManager(storage);

  // Register the open webview command
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.openWebview', () => {
      webviewManager.openOrReveal();
    })
  );

  // Register the open manager command (alias)
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.openManager', () => {
      webviewManager.openOrReveal();
    })
  );

  // 5. All other commands
  registerCommands(context, storage, treeProvider);

  // 6. Register disposables
  context.subscriptions.push(treeView, statusBarManager as unknown as vscode.Disposable);

  // 7. Show welcome message on first install
  const isFirstInstall = !context.globalState.get('quickPrompt.installed');
  if (isFirstInstall) {
    context.globalState.update('quickPrompt.installed', true);
    vscode.window
      .showInformationMessage(
        '⚡ Quick Prompt installed! Click the lightning icon in the Activity Bar to manage your prompts.',
        'Open Manager'
      )
      .then((choice) => {
        if (choice === 'Open Manager') {
          webviewManager.openOrReveal();
        }
      });
  }
}

export function deactivate(): void {
  console.log('[Quick Prompt] Extension deactivated');
}
