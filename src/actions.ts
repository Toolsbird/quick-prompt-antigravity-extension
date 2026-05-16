import * as vscode from 'vscode';
import { Prompt, Skill } from './models';
import { StorageService } from './storage';

/**
 * Shared action to inject a prompt into the AI Chat panel with full context.
 * This handles Standalone Skill prepending, variable replacement, and the injection sequence.
 */
export async function injectPrompt(prompt: Prompt, storage: StorageService): Promise<void> {
  let content = prompt.content;

  // 1. Link Standalone Skill if available
  if (prompt.skillId) {
    const skills = storage.getSkills();
    const skill = skills.find((s: Skill) => s.id === prompt.skillId);
    if (skill) {
      content = `[SYSTEM SKILL: ${skill.name}]\n${skill.content}\n\n[USER TASK]\n${prompt.content}`;
    }
  }

  // 2. Variable replacement (if editor available)
  const editor = vscode.window.activeTextEditor;
  let resolvedContent = content;

  if (editor) {
    const selection = editor.document.getText(editor.selection);
    const fileName = editor.document.fileName.split(/[\\\\/]/).pop() || '';
    const language = editor.document.languageId;

    // Smart replacement of built-in variables
    resolvedContent = resolvedContent
      .replace(/\\{\\{selection\\}\\}/g, selection || '(no source selection)')
      .replace(/\\{\\{file\\}\\}/g, fileName)
      .replace(/\\{\\{language\\}\\}/g, language);
  }

  // --- NEW: DIRECT INJECTION (Prefer Antigravity API) ---
  const tryDirectInjections = async () => {
    // 1. Primary: Antigravity "sendTextToChat" (Immediate execution)
    try {
      // @ts-ignore
      await vscode.commands.executeCommand('antigravity.sendTextToChat', {
        text: resolvedContent,
        mode: 'planning' // As requested, defaulting to planning mode
      });
      return true;
    } catch { /* skip */ }

    // 2. Secondary: Workbench "chat.open" (Populate UI with query)
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: resolvedContent
      });
      return true;
    } catch { /* skip */ }

    return false;
  };

  const directInjected = await tryDirectInjections();

  if (!directInjected) {
    // Fallback: Clipboard & Focused Paste (Original Method)
    await vscode.env.clipboard.writeText(resolvedContent);

    const chatCommands = [
      'antigravity.agent.open',
      'antigravity.chat.open',
      'cursor.chat.open',
      'workbench.action.chat.open',
      'inlineChat.start',
    ];

    let chatOpened = false;
    for (const cmd of chatCommands) {
      try {
        await vscode.commands.executeCommand(cmd);
        chatOpened = true;
        break;
      } catch { continue; }
    }

    if (chatOpened) {
      const pasteSequence = async (ms: number) => {
        await new Promise(r => setTimeout(r, ms));
        try {
          await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
          return true;
        } catch { return false; }
      };

      await pasteSequence(350);
      vscode.window.setStatusBarMessage(`⚡ Prompt prepared! (Cmd+V if needed)`, 5000);
    }
  } else {
    vscode.window.setStatusBarMessage(`🚀 Prompt sent directly to AI!`, 3000);
  }
}
