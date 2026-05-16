import * as vscode from 'vscode';
import { StorageService } from './storage';
import { injectPrompt } from './actions';
import { WEBVIEW_STYLES, WEBVIEW_HTML, WEBVIEW_JS } from './webviewConstants';

export class WebviewManager {
  private _panel: vscode.WebviewPanel | undefined;
  private readonly _storage: StorageService;

  constructor(storage: StorageService) {
    this._storage = storage;
    // Update view if data changes
    this._storage.onDidChange(() => this._syncWebview());
  }

  public openOrReveal(): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (this._panel) {
      this._panel.reveal(column);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      'quickPromptManager',
      '⚡ Quick Prompt Manager',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this._panel.webview.html = this._getHtml();
    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage((m) => this._handleMessage(m));

    // Initial sync
    this._syncWebview();
  }

  private async _syncWebview(): Promise<void> {
    if (!this._panel) return;
    const isLoggedIn = await this._storage.checkLoggedIn();
    this._panel.webview.postMessage({
      type: 'sync',
      prompts: this._storage.getPrompts(),
      categories: this._storage.getCategories(),
      skills: this._storage.getSkills(),
      isPro: this._storage.isPro(),
      isLoggedIn: isLoggedIn,
      isEnabled: vscode.workspace.getConfiguration('quickPrompt').get<boolean>('enabled', true)
    });
  }

  private async _handleMessage(message: any): Promise<void> {
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
        } catch (e: any) {
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
        this._syncWebview();
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
          this._syncWebview();
        } catch (e: any) {
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
        } else {
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
        this._syncWebview();
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
          await injectPrompt(prompt, this._storage);
        }
        break;
      }

      case 'copyPrompt': {
        const { content } = message;
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage('Prompt copied to clipboard!');
        break;
      }
      
      case 'sync': {
        try {
          const result = await this._storage.syncWithCloud();
          if (result.success) {
            this._panel?.webview.postMessage({ type: 'success', msg: result.message });
            this._syncWebview(); // Refresh UI with merged data
          } else {
            this._panel?.webview.postMessage({ type: 'error', msg: result.message });
          }
        } catch (e: any) {
          this._panel?.webview.postMessage({ type: 'error', msg: e.message });
        }
        break;
      }

      case 'login': {
        const success = await this._storage.login();
        if (success) {
          this._panel?.webview.postMessage({ type: 'success', msg: 'Successfully connected!' });
          this._syncWebview();
        } else {
          this._panel?.webview.postMessage({ type: 'error', msg: 'Login failed. Please check your internet connection.' });
        }
        break;
      }

      case 'exportPrompts': {
        const data = this._storage.getExportData();
        const json = JSON.stringify(data, null, 2);
        const date = new Date().toISOString().slice(0, 10);
        const defaultUri = vscode.Uri.file(`quick-prompt-backup-${date}.json`);
        const uri = await vscode.window.showSaveDialog({
          defaultUri,
          filters: { 'JSON Files': ['json'] },
          title: 'Export All Prompts',
        });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));
          this._panel?.webview.postMessage({ type: 'success', msg: `✅ Exported successfully to ${uri.fsPath}` });
        }
        break;
      }

      case 'importPrompts': {
        const fileUris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { 'Prompt Files': ['json', 'csv'] },
          title: 'Import Prompts (JSON or CSV)',
        });

        if (!fileUris || fileUris.length === 0) break;

        const fileUri = fileUris[0];
        const rawBytes = await vscode.workspace.fs.readFile(fileUri);
        const rawContent = Buffer.from(rawBytes).toString('utf-8');
        const ext = fileUri.fsPath.split('.').pop()?.toLowerCase();

        try {
          let importPayload: any = {};

          if (ext === 'json') {
            const parsed = JSON.parse(rawContent);
            importPayload = {
              prompts: parsed.prompts || [],
              categories: parsed.categories || [],
              skills: parsed.skills || [],
            };
          } else if (ext === 'csv') {
            const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) throw new Error('CSV file is empty or has no data rows.');

            const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
            const titleIdx = headers.indexOf('title');
            const contentIdx = headers.indexOf('content');
            const categoryIdx = headers.indexOf('category');
            const favoriteIdx = headers.indexOf('isfavorite');

            if (titleIdx === -1 || contentIdx === -1) {
              throw new Error('CSV must have "title" and "content" columns in the header row.');
            }

            const prompts: any[] = [];
            for (let i = 1; i < lines.length; i++) {
              const cols = parseCSVLine(lines[i]);
              const title = cols[titleIdx]?.trim();
              const content = cols[contentIdx]?.trim();
              if (!title || !content) continue;
              prompts.push({
                title,
                content,
                category: categoryIdx !== -1 ? (cols[categoryIdx]?.trim() || 'Imported') : 'Imported',
                isFavorite: favoriteIdx !== -1 ? cols[favoriteIdx]?.trim().toLowerCase() === 'true' : false,
              });
            }
            importPayload = { prompts, categories: [], skills: [] };
          } else {
            throw new Error('Unsupported file format. Please use .json or .csv');
          }

          const result = await this._storage.importData(importPayload);
          const parts: string[] = [];
          if (result.prompts > 0) parts.push(`${result.prompts} prompt(s)`);
          if (result.skills > 0) parts.push(`${result.skills} skill(s)`);
          if (result.categories > 0) parts.push(`${result.categories} new category/ies`);

          if (parts.length > 0) {
            this._panel?.webview.postMessage({ type: 'success', msg: `✅ Imported ${parts.join(', ')}!` });
          } else {
            this._panel?.webview.postMessage({ type: 'success', msg: 'ℹ️ No new items found — all already exist in your library.' });
          }
          this._syncWebview();
        } catch (e: any) {
          this._panel?.webview.postMessage({ type: 'error', msg: `Import failed: ${e.message}` });
        }
        break;
      }
    }
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quick Prompt Manager</title>
  <style>${WEBVIEW_STYLES}</style>
</head>
<body>
  ${WEBVIEW_HTML}
  <script>${WEBVIEW_JS}</script>
</body>
</html>`;
  }
}

/** Parses a single CSV line, respecting quoted fields with commas and escaped quotes. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
