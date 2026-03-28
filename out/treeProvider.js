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
exports.QuickPromptTreeProvider = exports.PromptTreeItem = exports.CategoryTreeItem = void 0;
const vscode = __importStar(require("vscode"));
// ---- Tree Item Types -----
class CategoryTreeItem extends vscode.TreeItem {
    constructor(category, promptCount, collapsibleState) {
        super(category.name, collapsibleState);
        this.category = category;
        this.promptCount = promptCount;
        this.contextValue = 'category';
        this.tooltip = `${category.name} — ${promptCount} prompt(s)`;
        this.description = `${promptCount}`;
        this.iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.blue'));
    }
}
exports.CategoryTreeItem = CategoryTreeItem;
class PromptTreeItem extends vscode.TreeItem {
    constructor(prompt) {
        super(prompt.title, vscode.TreeItemCollapsibleState.None);
        this.prompt = prompt;
        this.contextValue = prompt.isFavorite ? 'favoritePrompt' : 'prompt';
        this.description = prompt.content.length > 60
            ? prompt.content.substring(0, 60) + '…'
            : prompt.content;
        this.tooltip = new vscode.MarkdownString(`### ${prompt.title}\n\n${prompt.content}\n\n---\n_Category: ${prompt.category} | Uses: ${prompt.useCount || 0}_`);
        this.iconPath = new vscode.ThemeIcon(prompt.isFavorite ? 'star-full' : 'symbol-string', new vscode.ThemeColor(prompt.isFavorite ? 'charts.yellow' : 'foreground'));
        this.command = {
            command: 'quickPrompt.usePrompt',
            title: 'Use Prompt',
            arguments: [this],
        };
    }
}
exports.PromptTreeItem = PromptTreeItem;
// ---- Tree Data Provider -----
class QuickPromptTreeProvider {
    constructor(storage) {
        this.storage = storage;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        storage.onDidChange(() => this.refresh());
    }
    refresh() {
        this._onDidChangeTreeData.fire(null);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // ROOT — show categories
            const categories = this.storage.getCategories();
            const prompts = this.storage.getPrompts();
            // Add a virtual "⭐ Favorites" category at the top
            const favCount = prompts.filter((p) => p.isFavorite).length;
            const items = [];
            if (favCount > 0) {
                items.push(new CategoryTreeItem({ id: '__favorites__', name: '⭐  Favorites', createdAt: 0 }, favCount, vscode.TreeItemCollapsibleState.Expanded));
            }
            // Real categories that have at least one prompt
            const usedCategoryNames = new Set(prompts.map((p) => p.category));
            categories
                .filter((c) => usedCategoryNames.has(c.name))
                .forEach((cat) => {
                const count = prompts.filter((p) => p.category === cat.name).length;
                items.push(new CategoryTreeItem(cat, count, vscode.TreeItemCollapsibleState.Collapsed));
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
exports.QuickPromptTreeProvider = QuickPromptTreeProvider;
