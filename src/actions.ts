import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { Prompt, Skill } from "./models";
import type { StorageService } from "./storage";

// Debug log file path
const LOG_FILE = path.join(
  require("os").homedir(),
  "quick-prompt-inject-debug.log",
);

/**
 * Shared action to inject a prompt into the AI Chat panel with full context.
 * This handles Standalone Skill prepending, variable replacement, and the injection sequence.
 */
export async function injectPrompt(
  prompt: Prompt,
  storage: StorageService,
): Promise<void> {
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
    const fileName = editor.document.fileName.split(/[\\\\/]/).pop() || "";
    const language = editor.document.languageId;

    // Smart replacement of built-in variables
    resolvedContent = resolvedContent
      .replace(/\\{\\{selection\\}\\}/g, selection || "(no source selection)")
      .replace(/\\{\\{file\\}\\}/g, fileName)
      .replace(/\\{\\{language\\}\\}/g, language);
  }

  // --- DIRECT INJECTION PIPELINE (with file-based diagnostic logging) ---
  const logLines: string[] = [];
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    logLines.push(line);
    console.log(`[QuickPrompt] ${msg}`);
  };
  log(`Starting injection for prompt: "${prompt.title}"`);
  log(`Resolved content length: ${resolvedContent.length} chars`);

  // Always copy content to clipboard first for the paste actions
  await vscode.env.clipboard.writeText(resolvedContent);
  log("Content copied to clipboard.");

  // Discover which commands are actually registered in this IDE
  const allCommands = await vscode.commands.getCommands(true);

  log(`Total registered commands: ${allCommands.length}`);
  const interestingCommands = allCommands.filter(c =>
    c.includes("antigravity") ||
    c.includes("agent") ||
    (c.includes("chat") && c.includes("focus"))
  );
  log(`Interesting commands: ${JSON.stringify(interestingCommands, null, 2)}`);

  // 1. Antigravity-specific Native Direct/Draft Strategy
  if (
    allCommands.includes("antigravity.sendPromptToAgentPanel") ||
    allCommands.includes("antigravity.agentSidePanel.focus") ||
    allCommands.includes("antigravity.agentSidePanel.open")
  ) {
    log("Antigravity detected. Running native injection strategy...");
    const autoSubmit = vscode.workspace.getConfiguration("quickPrompt").get<boolean>("autoSubmit", false);

    // DIRECT NATIVE SUBMISSION (If autoSubmit is enabled):
    if (autoSubmit && allCommands.includes("antigravity.sendPromptToAgentPanel")) {
      log("Auto-Submit is enabled. Using direct native injection...");
      try {
        if (allCommands.includes("antigravity.agentSidePanel.open")) {
          await vscode.commands.executeCommand("antigravity.agentSidePanel.open");
        } else if (allCommands.includes("antigravity.openAgent")) {
          await vscode.commands.executeCommand("antigravity.openAgent");
        }
        if (allCommands.includes("antigravity.agentSidePanel.focus")) {
          await vscode.commands.executeCommand("antigravity.agentSidePanel.focus");
        }
        await new Promise((r) => setTimeout(r, 300));

        await vscode.commands.executeCommand(
          "antigravity.sendPromptToAgentPanel",
          resolvedContent
        );
        log("✅ Successfully auto-submitted via Antigravity native command.");
        vscode.window.setStatusBarMessage("🚀 Prompt sent to AI Chat!", 3000);
        try {
          fs.writeFileSync(LOG_FILE, logLines.join("\n"), "utf-8");
        } catch (e) {}
        return;
      } catch (err: any) {
        log(`Antigravity auto-submit native injection failed: ${err?.message || err}. Falling back to pre-fill...`);
      }
    }

    // FOCUS & PASTE STRATEGY (Draft/Pre-fill Mode - If autoSubmit is disabled):
    log("Draft/Pre-fill Mode is enabled. Focusing and pasting prompt...");
    try {
      // Step 1: Open the panel
      if (allCommands.includes("antigravity.agentSidePanel.open")) {
        await vscode.commands.executeCommand("antigravity.agentSidePanel.open");
      } else if (allCommands.includes("antigravity.openAgent")) {
        await vscode.commands.executeCommand("antigravity.openAgent");
      }
      
      // Step 2: Focus the panel
      if (allCommands.includes("antigravity.agentSidePanel.focus")) {
        await vscode.commands.executeCommand("antigravity.agentSidePanel.focus");
      }

      // Wait a short delay to let panel render/mount
      await new Promise((r) => setTimeout(r, 350));

      // Step 3: Focus the chat input box natively using toggleChatFocus
      if (allCommands.includes("antigravity.toggleChatFocus")) {
        await vscode.commands.executeCommand("antigravity.toggleChatFocus");
        log("Executed antigravity.toggleChatFocus to target the chat input box.");
      }

      // Wait a short delay for input box focus to settle
      await new Promise((r) => setTimeout(r, 150));

      // Step 4: Execute native paste command into the focused text input box
      await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
      log("✅ Successfully pasted draft into Antigravity chat input.");
      vscode.window.setStatusBarMessage("🚀 Prompt pre-filled! Press Enter to send.", 4000);
      try {
        fs.writeFileSync(LOG_FILE, logLines.join("\n"), "utf-8");
      } catch (e) {}
      return;
    } catch (err: any) {
      log(`Antigravity draft focus/paste strategy failed: ${err?.message || err}`);
    }
  }

  // 2. VS Code Native Chat Populate Strategy (No-Send)
  if (allCommands.includes("workbench.action.chat.open")) {
    log(
      "VS Code Native Chat detected. Running non-sending populate strategy...",
    );
    try {
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: resolvedContent,
        isPartialQuery: true, // Only populate the input box, DO NOT send!
      });
      log("✅ Successfully populated native VS Code Chat.");
      vscode.window.setStatusBarMessage("🚀 Prompt pasted in AI Chat!", 3000);
      try {
        fs.writeFileSync(LOG_FILE, logLines.join("\n"), "utf-8");
      } catch (e) {}
      return;
    } catch (err: any) {
      log(`VS Code native chat populate failed: ${err?.message || err}`);
    }
  }

  // 3. Fallback for other AI Chats (Cursor, Copilot, etc.)
  const fallbackCmds = [
    "cursor.chat.open",
    "workbench.panel.chat.view.copilot.focus",
    "antigravity.chat.open",
    "workbench.action.chat.focus",
  ].filter((c) => allCommands.includes(c));

  log(`Running fallback commands: ${fallbackCmds.join(", ") || "NONE"}`);

  let chatOpened = false;
  for (const cmd of fallbackCmds) {
    try {
      log(`Opening chat via: ${cmd}`);
      await vscode.commands.executeCommand(cmd);
      chatOpened = true;
      log(`Chat opened with: ${cmd}`);
      break;
    } catch (err: any) {
      log(`Failed to open chat with ${cmd}: ${err?.message || err}`);
    }
  }

  if (chatOpened) {
    // Give the chat panel time to render and grab focus
    await new Promise((r) => setTimeout(r, 400));

    // Dynamically trigger focus input commands if registered
    const focusInputCmds = [
      "cursor.chat.focusInput",
      "workbench.action.chat.focusInput"
    ].filter(c => allCommands.includes(c));

    for (const cmd of focusInputCmds) {
      try {
        await vscode.commands.executeCommand(cmd);
        log(`Executed dynamic fallback focus input command: ${cmd}`);
      } catch (e) {}
    }

    await new Promise((r) => setTimeout(r, 150));

    try {
      await vscode.commands.executeCommand(
        "editor.action.clipboardPasteAction",
      );
      log("Paste command executed.");
    } catch (err: any) {
      log(`Paste failed: ${err?.message || err}`);
    }
    vscode.window.setStatusBarMessage(
      `⚡ Prompt copied! Press Cmd+V to paste into chat.`,
      5000,
    );
  } else {
    log("No chat commands available at all. Showing info message.");
    vscode.window.showInformationMessage(
      "⚡ Prompt copied to clipboard! Open AI chat and press Cmd+V to paste.",
    );
  }

  log("Injection pipeline complete.");
  try {
    fs.writeFileSync(LOG_FILE, logLines.join("\n"), "utf-8");
  } catch (e) {}
}
