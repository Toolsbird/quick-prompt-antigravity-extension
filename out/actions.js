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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Debug log file path
const LOG_FILE = path.join(require('os').homedir(), 'quick-prompt-inject-debug.log');
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
    // --- DIRECT INJECTION PIPELINE (with file-based diagnostic logging) ---
    const logLines = [];
    const log = (msg) => { const line = `[${new Date().toISOString()}] ${msg}`; logLines.push(line); console.log(`[QuickPrompt] ${msg}`); };
    log(`Starting injection for prompt: "${prompt.title}"`);
    log(`Resolved content length: ${resolvedContent.length} chars`);
    // Always put content on clipboard as a safety net
    await vscode.env.clipboard.writeText(resolvedContent);
    log('Content copied to clipboard as fallback.');
    // 1. Discover which commands are actually registered in this IDE
    const allCommands = await vscode.commands.getCommands(true);
    log(`Total registered commands: ${allCommands.length}`);
    // 2. Define our injection strategies in priority order
    const strategies = [
        // Antigravity-specific commands
        { cmd: 'antigravity.sendTextToChat', args: { text: resolvedContent, mode: 'planning' }, label: 'Antigravity sendTextToChat (planning)' },
        { cmd: 'antigravity.sendTextToChat', args: { text: resolvedContent }, label: 'Antigravity sendTextToChat (text only)' },
        { cmd: 'antigravity.sendTextToChat', args: resolvedContent, label: 'Antigravity sendTextToChat (raw string)' },
        // VS Code native chat with query parameter
        { cmd: 'workbench.action.chat.open', args: { query: resolvedContent, isPartialQuery: true }, label: 'VS Code chat.open (partial query)' },
        { cmd: 'workbench.action.chat.open', args: { query: resolvedContent, isPartialQuery: false }, label: 'VS Code chat.open (full query)' },
        { cmd: 'workbench.action.chat.open', args: { query: resolvedContent }, label: 'VS Code chat.open (query only)' },
        // Cursor-specific
        { cmd: 'cursor.chat.open', args: { query: resolvedContent }, label: 'Cursor chat.open' },
        // Copilot-specific
        { cmd: 'workbench.panel.chat.view.copilot.focus', args: { query: resolvedContent }, label: 'Copilot focus + query' },
    ];
    // Filter to only strategies whose commands actually exist
    const availableStrategies = strategies.filter(s => allCommands.includes(s.cmd));
    log(`Available chat commands: ${[...new Set(availableStrategies.map(s => s.cmd))].join(', ') || 'NONE'}`);
    // Log commands that were NOT found (useful for debugging)
    const missingCmds = [...new Set(strategies.map(s => s.cmd))].filter(c => !allCommands.includes(c));
    if (missingCmds.length > 0) {
        log(`Commands NOT available in this IDE: ${missingCmds.join(', ')}`);
    }
    // 3. Try each available strategy
    let injected = false;
    for (const strategy of availableStrategies) {
        try {
            log(`Trying: ${strategy.label}...`);
            await vscode.commands.executeCommand(strategy.cmd, strategy.args);
            log(`✅ SUCCESS: ${strategy.label}`);
            injected = true;
            break;
        }
        catch (err) {
            log(`❌ FAILED: ${strategy.label} — ${err?.message || err}`);
        }
    }
    // 4. If direct injection worked, we're done
    if (injected) {
        vscode.window.setStatusBarMessage(`🚀 Prompt sent directly to AI Chat!`, 3000);
        log('Injection complete — prompt auto-injected.');
        try {
            fs.writeFileSync(LOG_FILE, logLines.join('\n'), 'utf-8');
        }
        catch (e) { }
        return;
    }
    // 5. Fallback: Open any chat panel and try clipboard paste
    log('All direct injections failed. Trying fallback: open chat + paste...');
    const fallbackCmds = [
        'antigravity.agent.open',
        'antigravity.chat.open',
        'workbench.action.chat.open',
        'cursor.chat.open',
        'workbench.action.chat.focus',
    ].filter(c => allCommands.includes(c));
    log(`Fallback commands available: ${fallbackCmds.join(', ') || 'NONE'}`);
    let chatOpened = false;
    for (const cmd of fallbackCmds) {
        try {
            log(`Opening chat via: ${cmd}`);
            await vscode.commands.executeCommand(cmd);
            chatOpened = true;
            log(`Chat opened with: ${cmd}`);
            break;
        }
        catch (err) {
            log(`Failed to open chat with ${cmd}: ${err?.message || err}`);
        }
    }
    if (chatOpened) {
        // Give the chat panel time to render and grab focus
        await new Promise(r => setTimeout(r, 500));
        try {
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            log('Paste command executed.');
        }
        catch (err) {
            log(`Paste failed (expected in chat panels): ${err?.message || err}`);
        }
        vscode.window.setStatusBarMessage(`⚡ Prompt copied! Press Cmd+V to paste into chat.`, 5000);
    }
    else {
        log('No chat commands available at all. Showing info message.');
        vscode.window.showInformationMessage('⚡ Prompt copied to clipboard! Open AI chat and press Cmd+V to paste.');
    }
    log('Injection pipeline complete.');
    try {
        fs.writeFileSync(LOG_FILE, logLines.join('\n'), 'utf-8');
    }
    catch (e) { }
}
