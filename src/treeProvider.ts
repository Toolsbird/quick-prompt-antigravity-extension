import * as vscode from 'vscode';
import { StorageService } from './storage';
import { Prompt, Category } from './models';

// ---- Tree Item Types -----

export class CategoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly category: Category,
    public readonly promptCount: number,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(category.name, collapsibleState);
    this.contextValue = 'category';
    this.tooltip = `${category.name} — ${promptCount} prompt(s)`;
    this.description = `${promptCount}`;
    this.iconPath = new vscode.ThemeIcon(
      'folder',
      new vscode.ThemeColor('charts.blue')
    );
  }
}

export class PromptTreeItem extends vscode.TreeItem {
  constructor(public readonly prompt: Prompt) {
    super(prompt.title, vscode.TreeItemCollapsibleState.None);
    this.contextValue = prompt.isFavorite ? 'favoritePrompt' : 'prompt';
    this.description = prompt.content.length > 60
      ? prompt.content.substring(0, 60) + '…'
      : prompt.content;
    this.tooltip = new vscode.MarkdownString(
      `### ${prompt.title}\n\n${prompt.content}\n\n---\n_Category: ${prompt.category} | Uses: ${prompt.useCount || 0}_`
    );
    this.iconPath = new vscode.ThemeIcon(
      prompt.isFavorite ? 'star-full' : 'symbol-string',
      new vscode.ThemeColor(
        prompt.isFavorite ? 'charts.yellow' : 'foreground'
      )
    );
    this.command = {
      command: 'quickPrompt.usePrompt',
      title: 'Use Prompt',
      arguments: [this],
    };
  }
}

export type QuickPromptTreeItem = CategoryTreeItem | PromptTreeItem;

// ---- Tree Data Provider -----

export class QuickPromptTreeProvider
  implements vscode.TreeDataProvider<QuickPromptTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    QuickPromptTreeItem | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly storage: StorageService) {
    storage.onDidChange(() => this.refresh());
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('quickPrompt.enabled')) {
        this.refresh();
      }
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: QuickPromptTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: QuickPromptTreeItem): QuickPromptTreeItem[] | any[] {
    const isEnabled = vscode.workspace.getConfiguration('quickPrompt').get<boolean>('enabled', true);
    if (!isEnabled) {
      if (!element) {
        return [new vscode.TreeItem("⚡ Quick Prompt (Disabled)")];
      }
      return [];
    }
    if (!element) {
      // ROOT — show categories
      const categories = this.storage.getCategories();
      const prompts = this.storage.getPrompts();

      // Add a virtual "⭐ Favorites" category at the top
      const favCount = prompts.filter((p) => p.isFavorite).length;
      const items: QuickPromptTreeItem[] = [];

      if (favCount > 0) {
        items.push(
          new CategoryTreeItem(
            { id: '__favorites__', name: '⭐  Favorites', createdAt: 0 },
            favCount,
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      // All categories
      categories
        .forEach((cat) => {
          const count = prompts.filter((p) => p.category === cat.name).length;
          items.push(
            new CategoryTreeItem(
              cat,
              count,
              count === 0 ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
            )
          );
        });

      return items;
    }

    if (element instanceof CategoryTreeItem) {
      const name = element.category.name;
      if (name === '⭐  Favorites') {
        return this.storage
          .getFavoritePrompts()
          .map((p) => new PromptTreeItem(p));
      }
      return this.storage
        .getPromptsByCategory(name)
        .map((p) => new PromptTreeItem(p));
    }

    return [];
  }
}
