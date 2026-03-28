"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const webview_1 = require("./webview");
function registerCommands(context, storage, treeProvider) {
    // ---- Use Prompt (inject to chat) ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.usePrompt', async (item) => {
        if (item?.prompt) {
            await storage.incrementUseCount(item.prompt.id);
            await (0, webview_1.injectPromptToChat)(item.prompt.content);
        }
    }));
    // ---- Inject by ID (used by status bar) ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.injectPromptById', async (id) => {
        const prompt = storage.getPrompts().find((p) => p.id === id);
        if (prompt) {
            await storage.incrementUseCount(id);
            await (0, webview_1.injectPromptToChat)(prompt.content);
        }
    }));
    // ---- Add Prompt ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.addPrompt', async () => {
        const title = await vscode.window.showInputBox({
            title: 'New Prompt — Title',
            prompt: 'Enter a name for your prompt',
            placeHolder: 'e.g. Debug This Code',
            validateInput: (v) => v.trim() ? undefined : 'Title cannot be empty',
        });
        if (!title) {
            return;
        }
        const content = await vscode.window.showInputBox({
            title: 'New Prompt — Content',
            prompt: 'Enter the prompt text. Use {{selection}} to include selected code.',
            placeHolder: 'Please review this code and…',
            validateInput: (v) => v.trim() ? undefined : 'Content cannot be empty',
        });
        if (!content) {
            return;
        }
        const categories = storage.getCategories().map((c) => c.name);
        const categoryPick = await vscode.window.showQuickPick([...categories, '$(add) Create new category…'], { title: 'Choose a Category', placeHolder: 'Select or create a category' });
        if (!categoryPick) {
            return;
        }
        let category = categoryPick;
        if (categoryPick.startsWith('$(add)')) {
            const newCat = await vscode.window.showInputBox({
                title: 'New Category',
                prompt: 'Enter category name',
                placeHolder: 'e.g. Architecture',
            });
            if (!newCat) {
                return;
            }
            await storage.addCategory(newCat);
            category = newCat;
        }
        const favPick = await vscode.window.showQuickPick(['⭐ Yes — pin to status bar', 'No'], { title: 'Add to Favorites (status bar)?' });
        const isFavorite = favPick?.startsWith('⭐') ?? false;
        await storage.addPrompt({ title, content, category, isFavorite, tags: [] });
        treeProvider.refresh();
        vscode.window.showInformationMessage(`✅ Prompt "${title}" saved!`);
    }));
    // ---- Edit Prompt ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.editPrompt', async (item) => {
        let prompt = item?.prompt;
        if (!prompt) {
            const prompts = storage.getPrompts();
            const pick = await vscode.window.showQuickPick(prompts.map((p) => ({ label: p.title, description: p.category, id: p.id })), { title: 'Choose a prompt to edit' });
            if (!pick) {
                return;
            }
            prompt = prompts.find((p) => p.id === pick.id);
        }
        if (!prompt) {
            return;
        }
        const title = await vscode.window.showInputBox({
            title: 'Edit Prompt — Title',
            value: prompt.title,
            validateInput: (v) => v.trim() ? undefined : 'Title cannot be empty',
        });
        if (title === undefined) {
            return;
        }
        const content = await vscode.window.showInputBox({
            title: 'Edit Prompt — Content',
            value: prompt.content,
            validateInput: (v) => v.trim() ? undefined : 'Content cannot be empty',
        });
        if (content === undefined) {
            return;
        }
        await storage.updatePrompt(prompt.id, { title, content });
        treeProvider.refresh();
        vscode.window.showInformationMessage(`✅ Prompt "${title}" updated!`);
    }));
    // ---- Delete Prompt ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.deletePrompt', async (item) => {
        const prompt = item?.prompt;
        if (!prompt) {
            return;
        }
        const confirm = await vscode.window.showWarningMessage(`Delete prompt "${prompt.title}"? This cannot be undone.`, { modal: true }, 'Delete');
        if (confirm === 'Delete') {
            await storage.deletePrompt(prompt.id);
            treeProvider.refresh();
            vscode.window.showInformationMessage(`Prompt deleted.`);
        }
    }));
    // ---- Toggle Favorite ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.toggleFavorite', async (item) => {
        if (!item?.prompt) {
            return;
        }
        const isFav = await storage.toggleFavorite(item.prompt.id);
        treeProvider.refresh();
        vscode.window.showInformationMessage(isFav
            ? `⭐ "${item.prompt.title}" added to status bar!`
            : `☆ "${item.prompt.title}" removed from status bar.`);
    }));
    // ---- Add Category ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.addCategory', async () => {
        const name = await vscode.window.showInputBox({
            title: 'New Category',
            prompt: 'Enter a name for the new category',
            placeHolder: 'e.g. Architecture',
            validateInput: (v) => v.trim() ? undefined : 'Category name cannot be empty',
        });
        if (!name) {
            return;
        }
        try {
            await storage.addCategory(name);
            treeProvider.refresh();
            vscode.window.showInformationMessage(`📁 Category "${name}" created!`);
        }
        catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }));
    // ---- Delete Category ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.deleteCategory', async (item) => {
        const name = item?.category?.name;
        if (!name || name === '⭐  Favorites') {
            return;
        }
        const confirm = await vscode.window.showWarningMessage(`Delete category "${name}"? Prompts inside will move to "Uncategorized".`, { modal: true }, 'Delete');
        if (confirm === 'Delete') {
            await storage.deleteCategory(name);
            treeProvider.refresh();
            vscode.window.showInformationMessage(`Category "${name}" deleted.`);
        }
    }));
    // ---- Rename Category ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.renameCategory', async (item) => {
        const name = item?.category?.name;
        if (!name || name === '⭐  Favorites') {
            return;
        }
        const newName = await vscode.window.showInputBox({
            title: 'Rename Category',
            value: name,
            validateInput: (v) => v.trim() ? undefined : 'Name cannot be empty',
        });
        if (!newName || newName === name) {
            return;
        }
        await storage.renameCategory(name, newName);
        treeProvider.refresh();
        vscode.window.showInformationMessage(`Category renamed to "${newName}"`);
    }));
    // ---- Search Prompts (Quick Pick) ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.searchPrompts', async () => {
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
                await (0, webview_1.injectPromptToChat)(prompt.content);
            }
        }
    }));
    // ---- Refresh ----
    context.subscriptions.push(vscode.commands.registerCommand('quickPrompt.refreshView', () => {
        treeProvider.refresh();
    }));
}
