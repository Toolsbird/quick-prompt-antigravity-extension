import * as vscode from 'vscode';
import { StorageService } from './storage';
import { QuickPromptTreeProvider, PromptTreeItem, CategoryTreeItem } from './treeProvider';
import { injectPromptToChat } from './webview';

export function registerCommands(
  context: vscode.ExtensionContext,
  storage: StorageService,
  treeProvider: QuickPromptTreeProvider
): void {

  // ---- Use Prompt (inject to chat) ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.usePrompt', async (item?: PromptTreeItem) => {
      if (item?.prompt) {
        await storage.incrementUseCount(item.prompt.id);
        await injectPromptToChat(item.prompt.content);
      }
    })
  );

  // ---- Inject by ID (used by status bar) ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.injectPromptById', async (id: string) => {
      const prompt = storage.getPrompts().find((p) => p.id === id);
      if (prompt) {
        await storage.incrementUseCount(id);
        await injectPromptToChat(prompt.content);
      }
    })
  );

  // ---- Add Prompt ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.addPrompt', async () => {
      const title = await vscode.window.showInputBox({
        title: 'New Prompt — Title',
        prompt: 'Enter a name for your prompt',
        placeHolder: 'e.g. Debug This Code',
        validateInput: (v) => v.trim() ? undefined : 'Title cannot be empty',
      });
      if (!title) { return; }

      const content = await vscode.window.showInputBox({
        title: 'New Prompt — Content',
        prompt: 'Enter the prompt text. Use {{selection}} to include selected code.',
        placeHolder: 'Please review this code and…',
        validateInput: (v) => v.trim() ? undefined : 'Content cannot be empty',
      });
      if (!content) { return; }

      const categories = storage.getCategories().map((c) => c.name);
      const categoryPick = await vscode.window.showQuickPick(
        [...categories, '$(add) Create new category…'],
        { title: 'Choose a Category', placeHolder: 'Select or create a category' }
      );
      if (!categoryPick) { return; }

      let category = categoryPick;
      if (categoryPick.startsWith('$(add)')) {
        const newCat = await vscode.window.showInputBox({
          title: 'New Category',
          prompt: 'Enter category name',
          placeHolder: 'e.g. Architecture',
        });
        if (!newCat) { return; }
        await storage.addCategory(newCat);
        category = newCat;
      }

      const favPick = await vscode.window.showQuickPick(
        ['⭐ Yes — pin to status bar', 'No'],
        { title: 'Add to Favorites (status bar)?' }
      );
      const isFavorite = favPick?.startsWith('⭐') ?? false;

      await storage.addPrompt({ title, content, category, isFavorite, tags: [] });
      treeProvider.refresh();
      vscode.window.showInformationMessage(`✅ Prompt "${title}" saved!`);
    })
  );

  // ---- Edit Prompt ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.editPrompt', async (item?: PromptTreeItem) => {
      let prompt = item?.prompt;
      if (!prompt) {
        const prompts = storage.getPrompts();
        const pick = await vscode.window.showQuickPick(
          prompts.map((p) => ({ label: p.title, description: p.category, id: p.id })),
          { title: 'Choose a prompt to edit' }
        );
        if (!pick) { return; }
        prompt = prompts.find((p) => p.id === pick.id);
      }
      if (!prompt) { return; }

      const title = await vscode.window.showInputBox({
        title: 'Edit Prompt — Title',
        value: prompt.title,
        validateInput: (v) => v.trim() ? undefined : 'Title cannot be empty',
      });
      if (title === undefined) { return; }

      const content = await vscode.window.showInputBox({
        title: 'Edit Prompt — Content',
        value: prompt.content,
        validateInput: (v) => v.trim() ? undefined : 'Content cannot be empty',
      });
      if (content === undefined) { return; }

      await storage.updatePrompt(prompt.id, { title, content });
      treeProvider.refresh();
      vscode.window.showInformationMessage(`✅ Prompt "${title}" updated!`);
    })
  );

  // ---- Delete Prompt ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.deletePrompt', async (item?: PromptTreeItem) => {
      const prompt = item?.prompt;
      if (!prompt) { return; }

      const confirm = await vscode.window.showWarningMessage(
        `Delete prompt "${prompt.title}"? This cannot be undone.`,
        { modal: true },
        'Delete'
      );
      if (confirm === 'Delete') {
        await storage.deletePrompt(prompt.id);
        treeProvider.refresh();
        vscode.window.showInformationMessage(`Prompt deleted.`);
      }
    })
  );

  // ---- Toggle Favorite ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.toggleFavorite', async (item?: PromptTreeItem) => {
      if (!item?.prompt) { return; }
      const isFav = await storage.toggleFavorite(item.prompt.id);
      treeProvider.refresh();
      vscode.window.showInformationMessage(
        isFav
          ? `⭐ "${item.prompt.title}" added to status bar!`
          : `☆ "${item.prompt.title}" removed from status bar.`
      );
    })
  );

  // ---- Add Category ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.addCategory', async () => {
      const name = await vscode.window.showInputBox({
        title: 'New Category',
        prompt: 'Enter a name for the new category',
        placeHolder: 'e.g. Architecture',
        validateInput: (v) => v.trim() ? undefined : 'Category name cannot be empty',
      });
      if (!name) { return; }
      try {
        await storage.addCategory(name);
        treeProvider.refresh();
        vscode.window.showInformationMessage(`📁 Category "${name}" created!`);
      } catch (e: unknown) {
        vscode.window.showErrorMessage((e as Error).message);
      }
    })
  );

  // ---- Delete Category ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.deleteCategory', async (item?: CategoryTreeItem) => {
      const name = item?.category?.name;
      if (!name || name === '⭐  Favorites') { return; }

      const confirm = await vscode.window.showWarningMessage(
        `Delete category "${name}"? Prompts inside will move to "Uncategorized".`,
        { modal: true },
        'Delete'
      );
      if (confirm === 'Delete') {
        await storage.deleteCategory(name);
        treeProvider.refresh();
        vscode.window.showInformationMessage(`Category "${name}" deleted.`);
      }
    })
  );

  // ---- Rename Category ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.renameCategory', async (item?: CategoryTreeItem) => {
      const name = item?.category?.name;
      if (!name || name === '⭐  Favorites') { return; }

      const newName = await vscode.window.showInputBox({
        title: 'Rename Category',
        value: name,
        validateInput: (v) => v.trim() ? undefined : 'Name cannot be empty',
      });
      if (!newName || newName === name) { return; }
      await storage.renameCategory(name, newName);
      treeProvider.refresh();
      vscode.window.showInformationMessage(`Category renamed to "${newName}"`);
    })
  );

  // ---- Search Prompts (Quick Pick) ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.searchPrompts', async () => {
      const prompts = storage.getPrompts();
      const items = prompts.map((p) => ({
        label: `${p.isFavorite ? '⭐ ' : ''}${p.title}`,
        description: p.category,
        detail: p.content.length > 100 ? p.content.substring(0, 100) + '…' : p.content,
        id: p.id,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        title: '⚡ Quick Prompt Search',
        placeHolder: 'Search by title or content…',
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (picked) {
        const prompt = prompts.find((p) => p.id === picked.id);
        if (prompt) {
          await storage.incrementUseCount(prompt.id);
          await injectPromptToChat(prompt.content);
        }
      }
    })
  );

  // ---- Refresh ----
  context.subscriptions.push(
    vscode.commands.registerCommand('quickPrompt.refreshView', () => {
      treeProvider.refresh();
    })
  );
}
