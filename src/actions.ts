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

  // Copy to clipboard
  await vscode.env.clipboard.writeText(resolvedContent);

  // Try to open chat panel (various potential commands depending on environment)
  const chatCommands = [
    'antigravity.agent.open',      // Primary Antigravity
    'antigravity.chat.open',       // Antigravity Alternative
    'cursor.chat.open',            // Cursor Compatibility
    'workbench.action.chat.open',  // Built-in VS Code Chat
    'inlineChat.start',            // Inline AI
  ];

  let chatOpened = false;
  for (const cmd of chatCommands) {
    try {
      await vscode.commands.executeCommand(cmd);
      chatOpened = true;
      break;
    } catch {
      continue;
    }
  }

  // Wait for panel to focus and trigger paste
  if (chatOpened) {
    const pasteSequence = async (ms: number) => {
      await new Promise(r => setTimeout(r, ms));
      try {
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        return true;
      } catch {
        return false;
      }
    };

    // Retry once if paste fails (sometimes UI focus takes a split second)
    const firstTry = await pasteSequence(350);
    if (!firstTry) {
      await pasteSequence(500);
    }
  }

  vscode.window.setStatusBarMessage(`⚡ Prompt prepared! (Cmd+V if needed)`, 5000);
}
