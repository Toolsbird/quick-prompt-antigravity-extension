import * as vscode from 'vscode';
import { StorageService } from './storage';
import { Prompt, Skill } from './models';

export class FavoritesBarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'quickPromptFavoritesPanel';
  private _view?: vscode.WebviewView;

  constructor(private readonly storage: StorageService) {
    storage.onDidChange(() => this.updateHtml());
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.storage.getContext().extensionUri],
    };

    this.updateHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'usePrompt':
          vscode.commands.executeCommand('quickPrompt.usePrompt', message.id);
          break;
      }
    });

    // Handle view visibility changes
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.updateHtml();
      }
    });
  }

  private updateHtml() {
    if (!this._view) return;
    
    // Fetch latest data from storage
    const favorites = this.storage.getFavoritePrompts();
    const favoriteSkills = this.storage.getSkills().filter(s => s.isFavorite);
    
    this._view.webview.html = this._generateHtml(favorites, favoriteSkills);
  }

  private _generateHtml(prompts: Prompt[], skills: Skill[]) {
    // Combine prompts and skills into a display-friendly list
    const items = [
      ...prompts.map(p => ({ id: p.id, title: p.title, content: p.content, type: 'prompt' })),
      ...skills.map(s => ({ id: s.id, title: s.name, content: s.content, type: 'skill' }))
    ];

    const itemsHtml = items.length > 0 
      ? items.map(item => `
        <div class="prompt-chip" 
             draggable="true" 
             onclick="handleClick('${item.id}')"
             onmouseover="showTooltip(event, '${item.title}')"
             onmouseout="hideTooltip()"
             ondragstart="handleDragStart(event, ${JSON.stringify(item.content).replace(/"/g, '&quot;')})">
          <span class="chip-icon">${item.type === 'skill' ? '🛠️' : '✨'}</span>
          <span class="chip-title">${item.title}</span>
        </div>
      `).join('')
      : '<div class="empty-state">No favorites yet. Star prompts in the sidebar to add them here!</div>';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          :root {
            --chip-bg: var(--vscode-button-secondaryBackground, #3a3d41);
            --chip-fg: var(--vscode-button-secondaryForeground, #ffffff);
            --chip-hover: var(--vscode-button-secondaryHoverBackground, #45494e);
            --border: var(--vscode-panel-border, #80808055);
            --font-size: 11px;
          }
          
          body {
            margin: 0;
            padding: 2px 4px;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 5px;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-behavior: smooth;
            background-color: transparent;
            height: 100%;
            font-family: var(--vscode-font-family);
            user-select: none;
          }

          /* Thin scrollbar */
          body::-webkit-scrollbar { height: 2px; }
          body::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 10px; }

          .prompt-chip {
            background-color: var(--chip-bg);
            color: var(--chip-fg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2px 8px;
            display: flex;
            align-items: center;
            gap: 3px;
            cursor: pointer;
            white-space: nowrap;
            font-size: var(--font-size);
            transition: all 0.15s ease-in-out;
            max-width: 130px;
            min-width: 50px;
            flex-shrink: 1;
          }

          .prompt-chip:hover {
            background-color: var(--chip-hover);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }

          .prompt-chip:active {
            transform: translateY(0);
          }

          .chip-icon { font-size: 10px; opacity: 0.9; flex-shrink: 0; }
          .chip-title { overflow: hidden; text-overflow: ellipsis; }

          .empty-state {
            font-size: 10px;
            opacity: 0.6;
            font-style: italic;
            padding-left: 10px;
          }

          /* Tooltip styles */
          #tooltip {
            position: fixed;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border: 1px solid var(--vscode-panel-border);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
            display: none;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        ${itemsHtml}
        <div id="tooltip"></div>

        <script>
          const vscode = acquireVsCodeApi();
          const tooltip = document.getElementById('tooltip');

          function handleDragStart(event, content) {
            // Very important: providing multiple formats for maximum compatibility
            event.dataTransfer.setData('text/plain', content);
            event.dataTransfer.setData('text/markdown', content);
            
            // Visual feedback
            event.dataTransfer.effectAllowed = 'copy';
          }

          function handleClick(id) {
            vscode.postMessage({ type: 'usePrompt', id: id });
          }

          function showTooltip(event, text) {
            tooltip.innerText = text;
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 30) + 'px';
          }

          function hideTooltip() {
            tooltip.style.display = 'none';
          }
        </script>
      </body>
      </html>
    `;
  }
}
