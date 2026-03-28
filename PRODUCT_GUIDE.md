# ⚡ Quick Prompt Manager: Complete Product Guide

Welcome to the **Quick Prompt Antigravity Extension**! Built natively for VS Code, this extension is a professional-grade prompt and context injection engine designed to supercharge your workflow. It allows you to save, organize, template, and instantly execute complex AI prompts directly into the VS Code Chat.

This guide provides a comprehensive deep dive into the architecture, features, and optimal workflows to help you master the product.

---

## 🏗️ 1. Core Architecture & Concepts

Quick Prompt consists of three main data elements that work together to structure your AI interactions:

### A. Prompts
Prompts are your reusable snippets of instructions or questions. Instead of typing "Can you find the bug in this code?" repeatedly, you save it once as a Prompt. 
*   **Dynamic Variables:** Prompts can contain variables like `{{selection}}` which intelligently pull context from your active editor at the exact moment of execution.

### B. Categories
Think of Categories as folders. As your prompt library grows, you can organize them by use-case (e.g., "Refactoring", "Testing", "Code Review").

### C. Skills (Advanced Context)
**Skills** are standalone, foundational sets of instructions (similar to Custom GPT instructions or System Prompts). 
*   **How they work:** You define a Skill (e.g., *"Act as a strict Senior TypeScript Developer enforcing SOLID principles"*). When you create a Prompt, you can "link" it to this Skill.
*   **The Magic:** When you execute the Prompt, the engine automatically prepends the Skill's deep context to your prompt. The AI receives your specific request *wrapped* in the persona of the Skill.

---

## 💻 2. Getting Started: The Dashboard

The Dashboard is your command center. Open it either by clicking the **⚡ Quick Prompt Manager** icon in your sidebar or running the command `Quick Prompt: Open Full UI`.

### Anatomy of the Dashboard
*   **Header Controls:** Here you can quickly create **New Prompts** and **New Skills**. 
*   **The Master Toggle:** The `Active/Paused` switch at the top allows you to instantly hide or show the extension's VS Code integrations (Sidebar and Status Bar) without uninstalling the extension.
*   **Sidebar Navigation:** Filter your view by *All Prompts*, *Favorites*, *Skills*, or specific *Categories*.
*   **Card Grid:** Your data is presented in beautiful, interactive cards highlighting use counts, associated skills, and quick-action buttons (Edit, Delete, Favorite).

---

## 🛠️ 3. Creating Smart Prompts

When you click **+ New Prompt**, you unlock the real power of the extension.

### Dynamic Variables
To make your prompts context-aware, you can inject variables by clicking the purple hint chips or typing them directly:
1.  **`{{selection}}`**: Automatically inserts whatever code you currently have highlighted in your open VS Code editor.
2.  **`{{file}}`**: Injects the name of the file you are currently working in.
3.  **`{{language}}`**: Injects the programming language of the active file (e.g., `typescript`, `python`).

**Example Prompt Setup:**
> *"Please review the following `{{language}}` code from `{{file}}` and suggest optimizations: \n\n `{{selection}}`"*

### Linking a Skill
In the prompt creation modal, use the **Core Skill Link** dropdown to attach a pre-made Skill. 
If you link a "Security Auditor" skill to your prompt, the final message sent to the AI will automatically look like this:
> `[SYSTEM SKILL: Security Auditor]`
> `[Always strictly prioritize OWASP top 10 vulnerabilities...]`
> 
> *Please review the following code...*

---

## 🚀 4. Seamless Execution (Integration Points)

The extension is deeply integrated into VS Code so you never have to break your flow. There are 4 ways to execute a prompt:

### 1. The Status Bar (The Fastest Way)
When you mark a prompt as a "Favorite" (⭐), it is instantly pinned to your bottom VS Code Status Bar.
*   **Use Case:** 1-Click execution. Highlight code, click the star icon in your status bar, and watch the AI instantly start working.

### 2. The Command Palette Quick View
Press `Cmd+Shift+Q` (Mac) or `Ctrl+Shift+P -> Search Prompts` to open a lightweight dropdown list of your prompts.
*   **Use Case:** Keyboard-only execution. Perfect for developers who don't want to use their mouse.

### 3. The Explorer Sidebar
A dedicated "Quick Prompts" view exists in your VS Code Activity Bar. It cleanly displays your folders and favorite prompts in a native tree structure.
*   **Use Case:** Great for keeping organized and executing while writing code. You can right-click any prompt here to *Edit*, *Delete*, or *Toggle Favorite*.

### 4. The Dashboard
You can click any prompt card directly inside the webview dashboard to execute it.

---

## ⚙️ 5. Extension Settings & Premium

*   **Kill Switch:** If you temporarily want the extension out of your way, use the Master Toggle in the dashboard or uncheck `Quick Prompt: Enabled` in your VS Code Settings. Both sync perfectly.
*   **Limits:** The free version of the extension tracks your prompt limits visually in the Dashboard sidebar. 
*   **Pro Upgrade:** Clicking `Upgrade to Pro` allows you to enter your license key. A successful activation unlocks an unlimited prompt library, unlimited status pins, and removes all restrictions. 

---
### 💡 Best Practice Workflow summary
1. Create a **Skill** defining a specific coding persona.
2. Build a **Prompt** utilizing `{{selection}}`, assign it a category, and link it to your new Skill.
3. Click the **⭐ Favorite** button on that prompt.
4. Highlight messy code in your editor.
5. Click your pinned prompt in the bottom **Status Bar**.
6. Watch the AI effortlessly rewrite your code using deep, skill-based context!
