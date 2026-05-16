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
exports.injectPrompt = injectPrompt;
const vscode = __importStar(require("vscode"));
/**
 * Shared action to inject a prompt into the AI Chat panel with full context.
 * This handles Standalone Skill prepending, variable replacement, and the injection sequence.
 */
async function injectPrompt(prompt, storage) {
    let content = prompt.content;
    // 1. Link Standalone Skill if available
    if (prompt.skillId) {
        const skills = storage.getSkills();
        const skill = skills.find((s) => s.id === prompt.skillId);
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
        }
        catch { /* skip */ }
        // 2. Secondary: Workbench "chat.open" (Populate UI with query)
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: resolvedContent
            });
            return true;
        }
        catch { /* skip */ }
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
            }
            catch {
                continue;
            }
        }
        if (chatOpened) {
            const pasteSequence = async (ms) => {
                await new Promise(r => setTimeout(r, ms));
                try {
                    await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
                    return true;
                }
                catch {
                    return false;
                }
            };
            await pasteSequence(350);
            vscode.window.setStatusBarMessage(`⚡ Prompt prepared! (Cmd+V if needed)`, 5000);
        }
    }
    else {
        vscode.window.setStatusBarMessage(`🚀 Prompt sent directly to AI!`, 3000);
    }
}
