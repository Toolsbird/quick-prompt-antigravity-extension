# ⚡ Quick Prompt Antigravity: Complete Deep Dive & Product Guide

Welcome to the definitive deep dive into the **Quick Prompt Antigravity Extension**. This document is designed to give you a **complete outlook** on what the product is, **how it works under the hood**, how it integrates natively with VS Code, and a **vital step-by-step guide** on how to master it.

Whether you are a user wanting to maximize your productivity or a developer wanting to understand the architecture, this guide covers everything.

---

## 🔎 1. Product Outlook: What is Quick Prompt?

As AI coding assistants like Antigravity, Cursor, and GitHub Copilot become ubiquitous in modern software development, a new problem has emerged: **Prompt fatigue**. 

Developers find themselves typing the same context-heavy instructions repeatedly (e.g., *"Act as a senior architectural engineer. Please review the following code, ensure it follows SOLID principles, check for OWASP vulnerabilities, and output the result in TypeScript: [CODE]"*).

**Quick Prompt Antigravity** solves this by acting as a professional-grade prompt management and context injection engine built specifically for VS Code. It allows you to:
1. Save and organize complex prompts.
2. Dynamically inject contextual variables (like the file name or highlighted code).
3. Prepend advanced "Skills" (system personas/instructions) to prompts.
4. Execute and paste these rich prompts directly into your AI Chat panel with a single click.

---

## 🏗️ 2. Under the Hood: The Architecture & Data Models

To understand how the product works, we must look at the three foundational data models driving the extension. This data is managed by a centralized `StorageService` using VS Code's `globalState`, ensuring your data is persistently synced across your local environment without needing external databases.

### A. Prompts
A `Prompt` is the core execution unit.
*   **Structure:** It contains an ID, Title, Content (the prompt string), a Category, a Use Count, and an optional `skillId`.
*   **Dynamic Interpolation:** Prompts support variables. During execution, regex parsers look for:
    *   `{{selection}}`: Replaced with the currently highlighted code in the editor.
    *   `{{file}}`: Replaced with the current active file name.
    *   `{{language}}`: Replaced with the file's language ID (e.g., `typescript`).

### B. Categories
Categories act as the folder system, allowing you to separate prompts by workflow (e.g., "Testing", "Refactoring", "Code Review"). If a category is deleted, its child prompts gracefully fall back to an "Uncategorized" state.

### C. Skills (Advanced Context Personas)
A `Skill` is a standalone, reusable block of system instructions. 
*   **How it Works:** Instead of writing "Act as a Senior Developer" in every prompt, you define a single "Senior Developer" Skill. 
*   **The Injection Sequence:** When a Prompt linked to a Skill is executed, the `injectPrompt` action dynamically constructs the final string:
    ```
    [SYSTEM SKILL: Senior Developer]
    Always adhere to clean code principles...

    [USER TASK]
    Please review this code: {{selection}}
    ```

---

## 🔌 3. Proper Integration: How It Hooks into VS Code

The power of Quick Prompt lies in its invisible, native-feeling integration with VS Code. The extension injects itself into four primary interaction points:

### 1. The Dynamic Webview Dashboard (React)
The heart of the extension is a rich, React-based webview (`src/webview.ts`). 
*   It functions as a standalone single-page application inside VS Code.
*   It communicates flawlessly with the VSC extension backend via message passing (`postMessage`), ensuring that when you hit "Delete" on the dashboard, the local `StorageService` instantly updates.

### 2. The Native Sidebar (TreeView)
Using VS Code's `TreeDataProvider` (`src/treeProvider.ts`), the extension provides a dedicated Activity Bar panel.
*   It categorizes prompts logically and groups "Favorites" at the top.
*   It supports context menus, allowing you to right-click a prompt to execute, edit, or delete it seamlessly.

### 3. The Status Bar (1-Click Execution)
Any prompt marked as a "Favorite" (⭐) creates a dedicated UI element in the VS Code bottom Status Bar (`src/statusBar.ts`).
*   This is the fastest integration. Highlight code, click the Star in the bottom bar, and the prompt executes instantly without ever opening a menu.

### 4. The Quick Pick Command Palette
The extension registers a keyboard shortcut (`Cmd+Shift+Q` on Mac). This opens a lightweight, searchable dropdown menu right over your code.

### 🤖 The Chat Injection Engine (`src/actions.ts`)
When a prompt is executed from *any* of the above UI points, the system triggers the `injectPrompt` pipeline:
1.  **Resolution:** It pulls the active editor, resolves `{{selection}}`, `{{file}}`, and `{{language}}`.
2.  **Aggregation:** It prepends the associated Skill (if any).
3.  **Clipboard Writing:** It writes the massive, aggregate prompt to the system clipboard.
4.  **Panel Triggering:** It actively polls VS Code to open the AI Chat window. It tries multiple command IDs to ensure maximum compatibility:
    * `antigravity.agent.open`
    * `cursor.chat.open`
    * `workbench.action.chat.open` (Built-in Copilot)
5.  **Simulated Paste:** Once the panel focuses, it forcefully triggers a clipboard paste command, dropping the massive prompt directly into the AI's input box.

---

## 📖 4. A Detailed User Guide: Mastering the Product

Here is a step-by-step guide to using the extension to drastically speed up your coding.

### Step 1: Initialize the Extension
1. Once installed, look right—you'll see the **⚡ Quick Prompt Manager** icon in your Activity Bar (sidebar).
2. Click the **"Open Full UI"** button (or run `Quick Prompt: Open Manager` from the Command Palette).
3. Welcome to the Dashboard. You'll notice 7 default prompts pre-installed to get you started.

### Step 2: Create a Mastery "Skill"
Before making a prompt, let's create a persona. 
1. Open the Dashboard.
2. Click **+ New Skill** at the top right.
3. **Title:** "Strict Security Auditor"
4. **Content:** "You are an elite cybersecurity expert. Focus exclusively on OWASP Top 10 vulnerabilities. Refuse to answer non-security related queries. Format your findings in a strict markdown table."
5. Save the skill.

### Step 3: Create a Dynamic Prompt
Now, let's create a reusable action that leverages that skill and your active code.
1. Click **+ New Prompt** in the Dashboard.
2. **Title:** "Security Check on File"
3. **Content:** "Please run a strict security audit on the following `{{language}}` code from the file `{{file}}`. Here is the code: \n\n `{{selection}}`"
4. **Category:** Select "Security".
5. **Core Skill Link:** Select "Strict Security Auditor" from the dropdown. 
6. **Mark as Favorite:** Check the "⭐ Add to Favorites" box.
7. Save.

### Step 4: The 1-Click Workflow Execution
1. Open any piece of messy, potentially vulnerable code in your editor.
2. Highlight a 50-line function with your mouse.
3. Look down at your **VS Code Status Bar** (the blue/purple bar at the very bottom of the window).
4. You will see a `⚡ Security Check on File` button. Click it.
5. **Magic Happens:** The AI Chat window will pop open, and a massive prompt containing the Security Expert instructions, the file name, the language, and the exact code you highlighted will instantly paste into the chat. Press Enter and watch the AI work.

### Step 5: Managing Your Data
*   **The Master Toggle:** Don't want the status bar icons cluttering your screen while you're presenting? Open the dashboard and flip the `Active / Paused` switch at the very top. This dynamically unloads the UI elements.
*   **Pro Upgrade Limits:** The dashboard tracks your usage visually. Free users are limited to 10 saving prompts. Clicking "Upgrade to Pro" allows you to insert a license key ensuring unlimited capacity.

---

## 🔒 5. Data Privacy & Security

**Your Prompts are Locally Owned.**
Unlike typical SaaS platforms, Quick Prompt Antigravity operates entirely on the client side. 
*   Prompts, Skills, and Categories are serialized into JSON and stored natively inside VS Code's internal embedded SQLite database via the `globalState` API.
*   There are no tracking pixels, external databases, or cloud syncs that intercept your prompt strategies. 
*   When executing a prompt, the data is pushed directly to the AI Chat extension (like Antigravity or Github Copilot) running side-by-side in your editor.

---

## 💡 Summary Outlook

Quick Prompt Antigravity is far more than a text-snippet tool. By treating **Prompts** as dynamic templates and **Skills** as composable personas, all deeply tied to the active VS Code editor state, it elevates you from a "Prompt Typer" to an **"AI Conductor"**. You build the infrastructure once, and execute massive, highly-specialized workflows with a single click in your status bar.
