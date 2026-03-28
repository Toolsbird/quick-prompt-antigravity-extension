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
exports.WebviewManager = void 0;
const vscode = __importStar(require("vscode"));
const actions_1 = require("./actions");
const webviewConstants_1 = require("./webviewConstants");
class WebviewManager {
    constructor(storage) {
        this._storage = storage;
        // Update view if data changes
        this._storage.onDidChange(() => this._syncWebview());
    }
    openOrReveal() {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (this._panel) {
            this._panel.reveal(column);
            return;
        }
        this._panel = vscode.window.createWebviewPanel('quickPromptManager', '⚡ Quick Prompt Manager', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        this._panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => {
            this._panel = undefined;
        });
        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage((m) => this._handleMessage(m));
        // Initial sync
        this._syncWebview();
    }
    _syncWebview() {
        if (!this._panel)
            return;
        this._panel.webview.postMessage({
            type: 'sync',
            prompts: this._storage.getPrompts(),
            categories: this._storage.getCategories(),
            skills: this._storage.getSkills(),
            isPro: this._storage.isPro(),
            isEnabled: vscode.workspace.getConfiguration('quickPrompt').get('enabled', true)
        });
    }
    async _handleMessage(message) {
        switch (message.type) {
            case 'getState': {
                this._syncWebview();
                break;
            }
            case 'addPrompt': {
                const { title, content, category, isFavorite, skillId } = message;
                try {
                    await this._storage.addPrompt({ title, content, category, isFavorite, skillId, tags: [] });
                    this._panel?.webview.postMessage({ type: 'success', msg: 'Prompt saved!' });
                }
                catch (e) {
                    this._panel?.webview.postMessage({ type: 'error', msg: e.message });
                }
                break;
            }
            case 'updatePrompt': {
                const { id, title, content, category, isFavorite, skillId } = message;
                await this._storage.updatePrompt(id, { title, content, category, isFavorite, skillId });
                this._panel?.webview.postMessage({ type: 'success', msg: 'Prompt updated!' });
                break;
            }
            case 'deletePrompt': {
                const { id } = message;
                await this._storage.deletePrompt(id);
                break;
            }
            case 'toggleFavorite': {
                const { id } = message;
                await this._storage.toggleFavorite(id);
                break;
            }
            case 'addCategory': {
                const { name } = message;
                try {
                    await this._storage.addCategory(name);
                    this._panel?.webview.postMessage({ type: 'success', msg: 'Category created!' });
                }
                catch (e) {
                    this._panel?.webview.postMessage({ type: 'error', msg: e.message });
                }
                break;
            }
            case 'activateLicense': {
                const { key } = message;
                const ok = await this._storage.activatePro(key);
                if (ok) {
                    this._panel?.webview.postMessage({ type: 'success', msg: 'Pro activated! Thank you for your support.' });
                    this._syncWebview();
                }
                else {
                    this._panel?.webview.postMessage({ type: 'error', msg: 'Invalid license key. Please check and try again.' });
                }
                break;
            }
            case 'addSkill': {
                const { name, content, isFavorite } = message;
                await this._storage.addSkill({ name, content, isFavorite });
                this._panel?.webview.postMessage({ type: 'success', msg: 'Skill added!' });
                this._syncWebview();
                break;
            }
            case 'updateSkill': {
                const { id, name, content, isFavorite } = message;
                await this._storage.updateSkill(id, { name, content, isFavorite });
                this._panel?.webview.postMessage({ type: 'success', msg: 'Skill updated!' });
                this._syncWebview();
                break;
            }
            case 'deleteSkill': {
                const { id } = message;
                await this._storage.deleteSkill(id);
                this._syncWebview();
                break;
            }
            case 'toggleSkillFavorite': {
                const { id } = message;
                await this._storage.toggleSkillFavorite(id);
                this._syncWebview();
                break;
            }
            case 'deleteCategory': {
                const { name } = message;
                await this._storage.deleteCategory(name);
                break;
            }
            case 'toggleExtensionState': {
                const { enabled } = message;
                await vscode.workspace.getConfiguration('quickPrompt').update('enabled', enabled, vscode.ConfigurationTarget.Global);
                break;
            }
            case 'usePrompt': {
                const { id } = message;
                const prompts = this._storage.getPrompts();
                const prompt = prompts.find((p) => p.id === id);
                if (prompt) {
                    await this._storage.incrementUseCount(id);
                    await (0, actions_1.injectPrompt)(prompt, this._storage);
                }
                break;
            }
            case 'copyPrompt': {
                const { content } = message;
                await vscode.env.clipboard.writeText(content);
                vscode.window.showInformationMessage('Prompt copied to clipboard!');
                break;
            }
        }
    }
    _getHtml() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quick Prompt Manager</title>
  <style>${webviewConstants_1.WEBVIEW_STYLES}</style>
</head>
<body>
  ${webviewConstants_1.WEBVIEW_HTML}
  <script>${webviewConstants_1.WEBVIEW_JS}</script>
</body>
</html>`;
    }
}
exports.WebviewManager = WebviewManager;
