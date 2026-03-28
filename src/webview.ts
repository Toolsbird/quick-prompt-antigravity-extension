import * as vscode from 'vscode';
import { StorageService } from './storage';
import { Prompt } from './models';

export class WebviewManager {
  private _panel: vscode.WebviewPanel | undefined;
  private _storage: StorageService;
  private _disposables: vscode.Disposable[] = [];

  constructor(storage: StorageService) {
    this._storage = storage;
  }

  openOrReveal(): void {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.One);
      this._syncWebview();
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      'quickPromptManager',
      'Quick Prompt Manager',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this._panel.webview.html = this._getHtml();

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this._handleMessage(message);
      },
      undefined,
      this._disposables
    );

    // Update webview when storage changes
    this._disposables.push(
      this._storage.onDidChange(() => this._syncWebview())
    );

    this._panel.onDidDispose(
      () => {
        this._panel = undefined;
        this._disposables.forEach((d) => d.dispose());
        this._disposables = [];
      },
      undefined,
      this._disposables
    );

    // Send initial data after a tick so the webview is ready
    setTimeout(() => this._syncWebview(), 200);
  }

  private _syncWebview(): void {
    if (!this._panel) {
      return;
    }
    this._panel.webview.postMessage({
      type: 'sync',
      prompts: this._storage.getPrompts(),
      categories: this._storage.getCategories(),
      isPro: this._storage.isPro(),
    });
  }

  private async _handleMessage(message: {
    type: string;
    [key: string]: unknown;
  }): Promise<void> {
    switch (message.type) {
      case 'getState':
        this._syncWebview();
        break;

      case 'addPrompt': {
        const { title, content, category, isFavorite } = message as {
          type: string;
          title: string;
          content: string;
          category: string;
          isFavorite: boolean;
        };
        if (!title || !content) {
          this._panel?.webview.postMessage({ type: 'error', msg: 'Title and content are required.' });
          return;
        }
        // Ensure category exists
        const cats = this._storage.getCategories();
        if (!cats.find((c) => c.name === category)) {
          await this._storage.addCategory(category);
        }
        await this._storage.addPrompt({ title, content, category, isFavorite, tags: [] });
        this._panel?.webview.postMessage({ type: 'success', msg: `Prompt "${title}" saved!` });
        break;
      }

      case 'updatePrompt': {
        const { id, title, content, category, isFavorite } = message as {
          type: string;
          id: string;
          title: string;
          content: string;
          category: string;
          isFavorite: boolean;
        };
        // Ensure category exists
        const cats = this._storage.getCategories();
        if (!cats.find((c) => c.name === category)) {
          await this._storage.addCategory(category);
        }
        await this._storage.updatePrompt(id, { title, content, category, isFavorite });
        this._panel?.webview.postMessage({ type: 'success', msg: `Prompt updated!` });
        break;
      }

      case 'deletePrompt': {
        const { id } = message as { type: string; id: string };
        await this._storage.deletePrompt(id);
        break;
      }

      case 'toggleFavorite': {
        const { id } = message as { type: string; id: string };
        await this._storage.toggleFavorite(id);
        break;
      }

      case 'addCategory': {
        const { name } = message as { type: string; name: string };
        try {
          await this._storage.addCategory(name);
        } catch (e: unknown) {
          const err = e as Error;
          this._panel?.webview.postMessage({ type: 'error', msg: err.message });
        }
        break;
      }

      case 'activateLicense': {
        const { key } = message as { type: string; key: string };
        const success = await this._storage.activatePro(key);
        if (success) {
          this._panel?.webview.postMessage({ type: 'success', msg: '🛡️ License Activated! You are now Pro.' });
          this._syncWebview();
        } else {
          this._panel?.webview.postMessage({ type: 'error', msg: '❌ Invalid license key. Please try again.' });
        }
        break;
      }

      case 'deleteCategory': {
        const { name } = message as { type: string; name: string };
        await this._storage.deleteCategory(name);
        break;
      }

      case 'usePrompt': {
        const { id } = message as { type: string; id: string };
        const prompts = this._storage.getPrompts();
        const prompt = prompts.find((p: Prompt) => p.id === id);
        if (prompt) {
          await this._storage.incrementUseCount(id);
          await injectPromptToChat(prompt.content);
        }
        break;
      }

      case 'copyPrompt': {
        const { content } = message as { type: string; content: string };
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage('Prompt copied to clipboard!');
        break;
      }
    }
  }

  private _getHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Quick Prompt Manager</title>
<style>
  /* ===== RESET & BASE ===== */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0f17;
    --surface: #161b2e;
    --surface2: #1e2540;
    --border: #2a3050;
    --accent: #FF5D00;
    --accent2: #FF9E00;
    --gold: #f59e0b;
    --gold-light: #fcd34d;
    --green: #10b981;
    --red: #ef4444;
    --text: #e2e8f0;
    --text2: #94a3b8;
    --text3: #64748b;
    --radius: 16px;
    --radius-sm: 10px;
    --shadow: 0 12px 40px rgba(0,0,0,0.5);
    --gold-gradient: linear-gradient(135deg, #f59e0b, #fbbf24);
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: radial-gradient(circle at 50% 0%, #1e2548 0%, var(--bg) 70%);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ===== LAYOUT ===== */
  .app { display: flex; flex-direction: column; height: 100vh; }

  .header {
    background: linear-gradient(135deg, var(--surface) 0%, #1a1f3c 100%);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: sticky; top: 0; z-index: 100;
    backdrop-filter: blur(12px);
  }

  .header-logo {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 15px rgba(255,93,0,0.4);
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .header-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
  .header-sub { font-size: 12px; color: var(--text2); }

  .header-actions { margin-left: auto; display: flex; gap: 8px; }

  .main { display: flex; flex: 1; overflow: hidden; }

  .sidebar {
    width: 220px; flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 12px 8px;
  }

  .content { flex: 1; overflow-y: auto; padding: 20px; }

  /* ===== SEARCH ===== */
  .search-bar {
    padding: 8px 12px;
    margin-bottom: 8px;
  }
  .search-input {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--text3); }

  /* ===== SIDEBAR NAV ===== */
  .nav-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--text3);
    padding: 8px 12px 4px;
  }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 13px;
    color: var(--text2);
    transition: all 0.15s;
    user-select: none;
    position: relative;
  }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { background: rgba(108,99,255,0.15); color: var(--accent2); }
  .nav-item.active::before {
    content: '';
    position: absolute; left: 0; top: 4px; bottom: 4px;
    width: 3px; border-radius: 3px;
    background: var(--accent);
  }
  .nav-item .badge {
    margin-left: auto;
    background: var(--surface2);
    border-radius: 99px;
    padding: 1px 7px;
    font-size: 11px; color: var(--text3);
  }
  .nav-item.active .badge { background: rgba(108,99,255,0.2); color: var(--accent2); }
  .nav-item .icon { font-size: 14px; width: 18px; text-align: center; }

  /* ===== BUTTONS ===== */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 600;
    border: none; cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #000; font-weight: 700; }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,93,0,0.5); filter: brightness(1.1); }
  .btn-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border); backdrop-filter: blur(4px); }
  .btn-ghost:hover { background: rgba(255,255,255,0.05); color: var(--text); border-color: var(--text3); }
  .btn-danger { background: transparent; color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
  .btn-danger:hover { background: rgba(239,68,68,0.1); }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .btn-icon { padding: 6px; border-radius: 8px; }

  .btn-upgrade {
    background: var(--gold-gradient);
    color: #451a03;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 18px;
    border-radius: 20px;
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .btn-upgrade:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5);
    filter: brightness(1.1);
  }

  .pro-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--gold-gradient);
    color: #451a03;
    font-size: 10px;
    font-weight: 900;
    border-radius: 6px;
    text-transform: uppercase;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: gold-pulse 2s infinite;
  }

  @keyframes gold-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .limit-counter {
    font-size: 11px;
    color: var(--text3);
    margin-top: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .limit-bar {
    height: 4px;
    flex: 1;
    background: var(--surface2);
    margin: 0 10px;
    border-radius: 2px;
    overflow: hidden;
  }
  .limit-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.3s;
  }
  .limit-fill.limit-full {
    background: var(--red);
  }

  /* ===== CARDS ===== */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .prompt-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    position: relative;
    transition: all 0.2s;
    cursor: pointer;
  }
  .prompt-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(108,99,255,0.15);
  }
  .prompt-card.is-favorite {
    border-color: rgba(245,158,11,0.4);
    background: linear-gradient(135deg, var(--surface) 0%, rgba(245,158,11,0.04) 100%);
  }
  .prompt-card.is-favorite:hover { border-color: var(--gold); box-shadow: 0 8px 24px rgba(245,158,11,0.15); }

  .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
  .card-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
    background: var(--surface2);
  }
  .card-title { font-size: 14px; font-weight: 600; line-height: 1.3; flex: 1; }
  .card-category {
    font-size: 11px; color: var(--text3);
    background: var(--surface2);
    padding: 2px 8px; border-radius: 99px;
    flex-shrink: 0; align-self: flex-start;
  }

  .card-preview {
    font-size: 12px; color: var(--text2);
    line-height: 1.6;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 12px;
    background: var(--surface2);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    font-family: 'SF Mono', 'Consolas', monospace;
    border-left: 3px solid var(--accent);
  }

  .card-footer {
    display: flex; align-items: center; gap: 6px;
  }
  .card-footer .spacer { flex: 1; }

  .fav-btn {
    background: transparent; border: none; cursor: pointer;
    font-size: 16px; padding: 4px;
    transition: transform 0.2s;
    line-height: 1;
  }
  .fav-btn:hover { transform: scale(1.3); }

  /* ===== EMPTY STATE ===== */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center;
    padding: 60px 24px; gap: 16px;
  }
  .empty-state .emoji { font-size: 56px; }
  .empty-state h3 { font-size: 18px; font-weight: 700; }
  .empty-state p { font-size: 14px; color: var(--text2); max-width: 320px; line-height: 1.6; }

  /* ===== MODAL ===== */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    opacity: 0; pointer-events: none;
    transition: opacity 0.2s;
  }
  .modal-overlay.open { opacity: 1; pointer-events: all; }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 28px;
    width: 100%; max-width: 560px;
    box-shadow: var(--shadow);
    transform: translateY(16px);
    transition: transform 0.2s;
  }
  .modal-overlay.open .modal { transform: translateY(0); }

  .modal-title {
    font-size: 18px; font-weight: 700; margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }

  .form-group { margin-bottom: 16px; }
  .form-label { font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
  .form-input, .form-select, .form-textarea {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    padding: 10px 14px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent); }
  .form-textarea { resize: vertical; min-height: 120px; font-family: 'SF Mono', 'Consolas', monospace; font-size: 13px; line-height: 1.7; }
  .form-select option { background: var(--surface); }

  .form-row { display: flex; gap: 12px; align-items: flex-end; }
  .form-row .form-group { flex: 1; margin-bottom: 0; }

  .checkbox-row {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    cursor: pointer;
  }
  .checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--gold); cursor: pointer; }
  .checkbox-row label { cursor: pointer; font-size: 14px; }

  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }

  /* ===== TOAST ===== */
  #toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 300;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 20px;
    font-size: 14px; font-weight: 500;
    box-shadow: var(--shadow);
    transform: translateY(80px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-width: 360px;
  }
  #toast.show { transform: translateY(0); opacity: 1; }
  #toast.success { border-left: 4px solid var(--green); }
  #toast.error { border-left: 4px solid var(--red); }

  .premium-modal-header {
    text-align: center;
    margin-bottom: 24px;
  }
  .premium-modal-header .icon {
    font-size: 48px;
    margin-bottom: 12px;
    display: block;
  }
  .premium-modal-header h2 {
    font-size: 24px;
    font-weight: 800;
    background: var(--gold-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .premium-features-list {
    list-style: none;
    margin: 20px 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .premium-features-list li {
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text2);
  }
  .premium-features-list li i {
    color: var(--green);
    font-size: 14px;
  }
  #toast.error { border-left: 4px solid var(--red); }
  #toast.info { border-left: 4px solid var(--accent); }

  /* ===== SCROLLBAR ===== */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text3); }

  /* ===== SECTION HEADER ===== */
  .section-header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
  }
  .section-title { font-size: 20px; font-weight: 700; }
  .section-count {
    background: rgba(108,99,255,0.15); color: var(--accent2);
    border-radius: 99px; padding: 2px 10px; font-size: 12px; font-weight: 600;
  }
  .section-actions { margin-left: auto; display: flex; gap: 8px; }

  /* ===== HINT CHIP ===== */
  .hint {
    font-size: 11px; color: var(--text3);
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 6px; padding: 4px 8px;
    margin-top: 6px; display: inline-block;
  }

  /* Use count pill */
  .use-count {
    font-size: 11px; color: var(--text3);
    display: flex; align-items: center; gap: 4px;
  }

  /* Animated gradient border for favorite cards in status bar section */
  @keyframes shimmer {
    0%,100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .fav-tag {
    font-size: 10px; background: rgba(245,158,11,0.15);
    color: var(--gold); border-radius: 99px; padding: 2px 8px;
    animation: shimmer 2s infinite;
  }

  /* Category add row */
  .cat-add-row { display: flex; gap: 8px; padding: 8px 12px; }
  .cat-add-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    padding: 7px 10px;
    font-size: 12px;
    outline: none;
  }
  .cat-add-input:focus { border-color: var(--accent); }
  .cat-add-input::placeholder { color: var(--text3); }
  .cat-add-btn {
    background: var(--accent); color: #fff; border: none;
    border-radius: var(--radius-sm);
    padding: 7px 12px; font-size: 12px; cursor: pointer;
    transition: background 0.15s;
  }
  .cat-add-btn:hover { background: #7c74ff; }

  /* Variable hint */
  .var-hints { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .var-hint {
    font-size: 11px; font-family: monospace;
    background: rgba(108,99,255,0.1); color: var(--accent2);
    border: 1px solid rgba(108,99,255,0.2);
    border-radius: 4px; padding: 2px 6px; cursor: pointer;
  }
  .var-hint:hover { background: rgba(108,99,255,0.2); }
</style>
</head>
<body>
<div class="app">
  <!-- HEADER -->
  <div class="header">
    <div class="header-logo">⚡</div>
    <div>
      <div class="header-title">Quick Prompt Manager <span id="proBadge" class="pro-badge" style="display:none;">PRO</span></div>
      <div class="header-sub">Antigravity / VS Code Extension</div>
    </div>
    <div class="header-actions">
      <button id="upgradeBtn" class="btn btn-upgrade" onclick="openPremiumModal()" style="display:none;">🚀 Upgrade to Pro</button>
      <button class="btn btn-primary" onclick="openAddModal()">＋ New Prompt</button>
    </div>
  </div>

  <div class="main">
    <!-- SIDEBAR -->
    <div class="sidebar">
      <div class="search-bar">
        <input class="search-input" type="text" id="searchInput" placeholder="🔍 Search prompts…" oninput="filterPrompts(this.value)" />
      </div>

      <div class="nav-section-label">Views</div>
      <div class="nav-item active" id="nav-all" onclick="selectNav('all')">
        <span class="icon">📋</span> All Prompts
        <span class="badge" id="badge-all">0</span>
      </div>
      <div class="nav-item" id="nav-favorites" onclick="selectNav('favorites')">
        <span class="icon">⭐</span> Favorites
        <span class="badge" id="badge-favorites">0</span>
      </div>

      <div class="nav-section-label" style="margin-top:12px;">Categories</div>
      <div id="categoryNav"></div>

      <div class="cat-add-row" style="margin-top:8px;">
        <input class="cat-add-input" id="newCatInput" type="text" placeholder="New category…" onkeydown="if(event.key==='Enter')addCategoryFromInput()" />
        <button class="cat-add-btn" onclick="addCategoryFromInput()">＋</button>
      </div>

      <!-- PREMIUM LIMITS -->
      <div id="premiumLimitBox" class="limit-counter" style="display:none; margin-top:20px;">
        <div>Free Prompts</div>
        <div class="limit-bar"><div id="limitFill" class="limit-fill" style="width:0%"></div></div>
        <div id="limitText">0/10</div>
      </div>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <div class="section-header">
        <div>
          <div class="section-title" id="sectionTitle">All Prompts</div>
        </div>
        <span class="section-count" id="sectionCount">0</span>
        <div class="section-actions">
          <button class="btn btn-ghost btn-sm" onclick="openAddModal()">＋ Add Prompt</button>
        </div>
      </div>

      <div class="card-grid" id="cardGrid"></div>

      <div class="empty-state" id="emptyState" style="display:none;">
        <div class="emoji">🗂️</div>
        <h3>No prompts here yet</h3>
        <p>Create your first prompt and star it to pin it to the status bar for instant access.</p>
        <button class="btn btn-primary" onclick="openAddModal()">＋ Create First Prompt</button>
      </div>
    </div>
  </div>
</div>

<!-- ADD / EDIT MODAL -->
<div class="modal-overlay" id="promptModal" onclick="closeModalOnBackdrop(event)">
  <div class="modal">
    <div class="modal-title" id="modalTitle">✨ New Prompt</div>

    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="form-input" id="promptTitle" type="text" placeholder="e.g. Debug This Code" maxlength="80" />
    </div>

    <div class="form-group">
      <label class="form-label">Prompt Content</label>
      <textarea class="form-textarea" id="promptContent" placeholder="Enter your prompt here…&#10;&#10;Tip: Use {{selection}} to insert selected editor text, {{file}} for filename, {{language}} for current language"></textarea>
      <div class="var-hints">
        <span class="hint">Variables:</span>
        <span class="var-hint" onclick="insertVar('{{selection}}')">{{selection}}</span>
        <span class="var-hint" onclick="insertVar('{{file}}')">{{file}}</span>
        <span class="var-hint" onclick="insertVar('{{language}}')">{{language}}</span>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="promptCategory"></select>
      </div>
    </div>

    <div style="margin-bottom:16px;">
      <label class="checkbox-row">
        <input type="checkbox" id="promptFavorite" />
        <label for="promptFavorite">⭐ Pin to Status Bar (Favorite)</label>
      </label>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePrompt()">💾 Save Prompt</button>
    </div>
  </div>
</div>

<!-- PREMIUM MODAL -->
<div class="modal-overlay" id="premiumModal" onclick="closeModalOnBackdrop(event)">
  <div class="modal">
    <div class="premium-modal-header">
      <span class="icon">💎</span>
      <h2>Upgrade to Pro</h2>
      <p style="font-size: 14px; color: var(--text2); margin-top: 8px;">Unleash the full power of Quick Prompt</p>
    </div>

    <ul class="premium-features-list">
      <li><i>✔</i> Unlimited Prompts</li>
      <li><i>✔</i> Cloud Sync (Coming Soon)</li>
      <li><i>✔</i> Unlimited Status Pins</li>
      <li><i>✔</i> Priority AI Models</li>
    </ul>

    <div class="form-group" style="margin-top: 24px;">
      <label class="form-label">License Key</label>
      <input class="form-input" id="licenseKeyInput" type="text" placeholder="QP-XXXX-XXXX-XXXX" style="letter-spacing: 1px;" />
    </div>

    <div class="modal-actions" style="flex-direction: column; align-items: stretch; gap: 12px;">
      <button class="btn btn-primary" onclick="activateLicense()" style="justify-content: center; height: 44px; font-size: 15px;">✨ Activate Pro Now</button>
      <button class="btn btn-ghost" onclick="closePremiumModal()" style="justify-content: center;">Maybe later</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div id="toast"></div>

<script>
  const vscode = acquireVsCodeApi();
  let allPrompts = [];
  let allCategories = [];
  let currentNav = 'all';
  let editingId = null;
  let searchQuery = '';

  // Request state on load
  window.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ type: 'getState' });
  });

  // Receive messages from extension
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'sync') {
      allPrompts = msg.prompts || [];
      allCategories = msg.categories || [];
      isPro = msg.isPro || false;
      render();
    } else if (msg.type === 'success') {
      closeModal();
      closePremiumModal();
      showToast(msg.msg, 'success');
    } else if (msg.type === 'error') {
      showToast(msg.msg, 'error');
    }
  });

  function render() {
    renderCategoryNav();
    renderCards();
    updateBadges();
    populateCategorySelect();
    updatePremiumUI();
  }

  function updatePremiumUI() {
    const badge = document.getElementById('proBadge');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const limitBox = document.getElementById('premiumLimitBox');
    
    if (isPro) {
      badge.style.display = 'inline-flex';
      upgradeBtn.style.display = 'none';
      limitBox.style.display = 'none';
    } else {
      badge.style.display = 'none';
      upgradeBtn.style.display = 'inline-flex';
      limitBox.style.display = 'block';
      
      const count = allPrompts.length;
      const fill = document.getElementById('limitFill');
      const text = document.getElementById('limitText');
      const percent = Math.min((count / 10) * 100, 100);
      
      fill.style.width = percent + '%';
      text.textContent = count + '/10';
      if (count >= 10) fill.classList.add('limit-full');
      else fill.classList.remove('limit-full');
    }
  }

  function openPremiumModal() {
    document.getElementById('premiumModal').classList.add('open');
  }

  function closePremiumModal() {
    document.getElementById('premiumModal').classList.remove('open');
  }

  function activateLicense() {
    const key = document.getElementById('licenseKeyInput').value.trim();
    if (!key) {
      showToast('Please enter a license key', 'error');
      return;
    }
    vscode.postMessage({ type: 'activateLicense', key });
  }

  function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    const usedCats = new Set(allPrompts.map(p => p.category));
    nav.innerHTML = allCategories
      .filter(c => usedCats.has(c.name))
      .map(c => {
        const count = allPrompts.filter(p => p.category === c.name).length;
        const active = currentNav === c.name ? 'active' : '';
        return \`<div class="nav-item \${active}" id="nav-\${c.id}" onclick="selectNav('\${escHtml(c.name)}')">
          <span class="icon">📁</span>
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escHtml(c.name)}</span>
          <span class="badge">\${count}</span>
        </div>\`;
      }).join('');
  }

  function updateBadges() {
    document.getElementById('badge-all').textContent = allPrompts.length;
    document.getElementById('badge-favorites').textContent = allPrompts.filter(p => p.isFavorite).length;
  }

  function getFilteredPrompts() {
    let list = allPrompts;
    if (currentNav === 'favorites') list = list.filter(p => p.isFavorite);
    else if (currentNav !== 'all') list = list.filter(p => p.category === currentNav);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderCards() {
    const grid = document.getElementById('cardGrid');
    const empty = document.getElementById('emptyState');
    const list = getFilteredPrompts();

    document.getElementById('sectionCount').textContent = list.length;

    const titles = {
      all: 'All Prompts',
      favorites: '⭐ Favorites'
    };
    document.getElementById('sectionTitle').textContent = titles[currentNav] || currentNav;

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    grid.innerHTML = list.map(p => cardHtml(p)).join('');
  }

  function cardHtml(p) {
    const favClass = p.isFavorite ? 'is-favorite' : '';
    const favStar = p.isFavorite ? '⭐' : '☆';
    const favTitle = p.isFavorite ? 'Remove from status bar' : 'Pin to status bar';
    const emoji = getEmoji(p.title);
    const uses = p.useCount || 0;

    return \`<div class="prompt-card \${favClass}" id="card-\${p.id}">
      <div class="card-header">
        <div class="card-icon">\${emoji}</div>
        <div class="card-title">\${escHtml(p.title)}</div>
        \${p.isFavorite ? '<span class="fav-tag">Status Bar</span>' : ''}
        <span class="card-category">\${escHtml(p.category)}</span>
      </div>
      <div class="card-preview">\${escHtml(p.content)}</div>
      <div class="card-footer">
        <button class="btn btn-primary btn-sm" onclick="usePrompt('\${p.id}')">▶ Use</button>
        <button class="btn btn-ghost btn-sm" onclick="copyPrompt('\${p.id}')">⎘ Copy</button>
        <button class="btn btn-ghost btn-sm" onclick="openEditModal('\${p.id}')">✏ Edit</button>
        <span class="spacer"></span>
        <span class="use-count">🔥 \${uses}</span>
        <button class="fav-btn" title="\${favTitle}" onclick="toggleFav('\${p.id}')">\${favStar}</button>
        <button class="fav-btn" title="Delete" onclick="deletePrompt('\${p.id}')" style="color:var(--red);">🗑</button>
      </div>
    </div>\`;
  }

  function getEmoji(title) {
    const t = title.toLowerCase();
    if (t.includes('debug') || t.includes('bug')) return '🐛';
    if (t.includes('test') || t.includes('unit')) return '🧪';
    if (t.includes('refactor') || t.includes('optim')) return '✨';
    if (t.includes('doc') || t.includes('comment')) return '📝';
    if (t.includes('secur')) return '🔒';
    if (t.includes('explain') || t.includes('learn')) return '📖';
    if (t.includes('convert') || t.includes('translat')) return '🌐';
    if (t.includes('api')) return '🔌';
    if (t.includes('perf')) return '⚡';
    return '💡';
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  function selectNav(name) {
    currentNav = name;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const found = document.getElementById('nav-' + name);
    if (found) found.classList.add('active');
    else {
      // category nav
      document.querySelectorAll('#categoryNav .nav-item').forEach(el => {
        if (el.textContent.trim().startsWith(name)) el.classList.add('active');
      });
    }
    renderCards();
  }

  function filterPrompts(q) {
    searchQuery = q;
    renderCards();
  }

  function populateCategorySelect() {
    const sel = document.getElementById('promptCategory');
    const cur = sel.value;
    sel.innerHTML = allCategories.map(c =>
      \`<option value="\${escHtml(c.name)}">\${escHtml(c.name)}</option>\`
    ).join('');
    if (cur) sel.value = cur;
  }

  // ====== MODAL ======
  function openAddModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = '✨ New Prompt';
    document.getElementById('promptTitle').value = '';
    document.getElementById('promptContent').value = '';
    document.getElementById('promptFavorite').checked = false;
    populateCategorySelect();
    document.getElementById('promptModal').classList.add('open');
    setTimeout(() => document.getElementById('promptTitle').focus(), 100);
  }

  function openEditModal(id) {
    const p = allPrompts.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = '✏ Edit Prompt';
    document.getElementById('promptTitle').value = p.title;
    document.getElementById('promptContent').value = p.content;
    document.getElementById('promptFavorite').checked = p.isFavorite;
    populateCategorySelect();
    document.getElementById('promptCategory').value = p.category;
    document.getElementById('promptModal').classList.add('open');
    setTimeout(() => document.getElementById('promptTitle').focus(), 100);
  }

  function closeModal() {
    document.getElementById('promptModal').classList.remove('open');
  }

  function closeModalOnBackdrop(e) {
    if (e.target === document.getElementById('promptModal')) closeModal();
  }

  function savePrompt() {
    const title = document.getElementById('promptTitle').value.trim();
    const content = document.getElementById('promptContent').value.trim();
    const category = document.getElementById('promptCategory').value;
    const isFavorite = document.getElementById('promptFavorite').checked;

    if (!title) { showToast('Please enter a title', 'error'); return; }
    if (!content) { showToast('Please enter prompt content', 'error'); return; }

    if (editingId) {
      vscode.postMessage({ type: 'updatePrompt', id: editingId, title, content, category, isFavorite });
    } else {
      vscode.postMessage({ type: 'addPrompt', title, content, category, isFavorite });
    }
  }

  function insertVar(v) {
    const ta = document.getElementById('promptContent');
    const start = ta.selectionStart, end = ta.selectionEnd;
    const val = ta.value;
    ta.value = val.substring(0, start) + v + val.substring(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + v.length;
  }

  // ====== ACTIONS ======
  function usePrompt(id) {
    vscode.postMessage({ type: 'usePrompt', id });
    showToast('Prompt sent to AI Chat! 🚀', 'success');
  }

  function copyPrompt(id) {
    const p = allPrompts.find(x => x.id === id);
    if (p) vscode.postMessage({ type: 'copyPrompt', content: p.content });
  }

  function toggleFav(id) {
    vscode.postMessage({ type: 'toggleFavorite', id });
  }

  function deletePrompt(id) {
    const p = allPrompts.find(x => x.id === id);
    if (!p) return;
    if (!confirm(\`Delete prompt "\${p.title}"? This cannot be undone.\`)) return;
    vscode.postMessage({ type: 'deletePrompt', id });
    showToast('Prompt deleted', 'info');
  }

  function addCategoryFromInput() {
    const input = document.getElementById('newCatInput');
    const name = input.value.trim();
    if (!name) return;
    vscode.postMessage({ type: 'addCategory', name });
    input.value = '';
  }

  // ====== TOAST ======
  let toastTimeout;
  function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show ' + type;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { t.className = ''; }, 3500);
  }
</script>
</body>
</html>`;
  }
}

export async function injectPromptToChat(content: string): Promise<void> {
  // Step 1: Replace template variables
  const editor = vscode.window.activeTextEditor;
  let resolved = content;
  if (editor) {
    const selection = editor.document.getText(editor.selection);
    const fileName = editor.document.fileName.split('/').pop() || '';
    const language = editor.document.languageId;
    resolved = resolved
      .replace(/\{\{selection\}\}/g, selection || '(no selection)')
      .replace(/\{\{file\}\}/g, fileName)
      .replace(/\{\{language\}\}/g, language);
  }

  // Step 2: Copy resolved text to clipboard — always works as fallback
  await vscode.env.clipboard.writeText(resolved);

  // Step 3: Try opening the Antigravity / VS Code Agent panel
  const agentOpenCommands = [
    'antigravity.agent.open',
    'antigravity.chat.open',
    'cursor.chat.open',
    'workbench.action.chat.open',
  ];
  for (const cmd of agentOpenCommands) {
    try {
      await vscode.commands.executeCommand(cmd);
      break;
    } catch {
      // Try next
    }
  }

  // Step 4: Wait for the Agent panel to focus its input field
  await new Promise<void>(resolve => setTimeout(resolve, 500));

  // Step 5: Attempt to paste into the focused input
  try {
    await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
  } catch {
    // Silently ignore — clipboard still has the text
  }

  // Step 6: Non-blocking status bar hint instead of annoying popup
  vscode.window.setStatusBarMessage('⚡ Prompt ready — press Cmd+V if not auto-pasted', 4000);
}
