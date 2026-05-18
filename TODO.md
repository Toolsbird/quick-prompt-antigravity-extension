# Quick Prompt Antigravity Extension — TODO List
> Last updated: 2026-05-18 | Current version: **v1.2.9** | Branch: `main`

---

## ✅ WORKING — Prompt Injection (Both Modes)

> **Auto Mode + Non-Auto (Draft) Mode are BOTH WORKING as of v1.2.9**

- [x] **Auto-Submit Mode** (`quickPrompt.autoSubmit = true`)
  - Opens Antigravity side panel → focuses it → sends prompt directly via `antigravity.sendPromptToAgentPanel`
  - Instant submission — no manual paste needed

- [x] **Draft/Pre-fill Mode** (`quickPrompt.autoSubmit = false`, default)
  - Opens Antigravity side panel → focuses it → toggles chat focus → pastes content as a draft
  - User presses Enter to send when ready

- [x] **VS Code Native Chat Fallback**
  - Uses `workbench.action.chat.open` with `isPartialQuery: true` to populate without sending

- [x] **Universal Fallback** (Cursor, Copilot, etc.)
  - Copies to clipboard and opens the relevant chat panel for manual paste

---

## 🔴 Critical / Must Fix

- [x] **Sync Feature Consolidation**
  - Removed legacy Google Drive sync in favor of robust, native GitHub Gist synchronization.

- [x] **Free-Tier Seed Race Condition**
  - On first install, ensure default prompts are fully seeded before webview activation. (Fixed in v1.2.5)

- [x] **Skill-to-Prompt Link — Favorite Save Bug**
  - Already patched in v1.2.2 and verified: saving a skill as favorite while linked to a prompt preserves the `linkedSkill` field.

- [x] **Prompt Auto-Inject Fails (Clipboard Fallback Triggers)**
  - Auto-injecting a prompt directly into the Antigravity/Cursor chat input box is failing. It falls back to copying to the clipboard and requires manual paste (Cmd+V).
  - Diagnostic file logging (`~/quick-prompt-inject-debug.log`) added in v1.2.7. Resolved by ensuring the side panel is opened and focused prior to running the direct native injection command.
  - **FULLY RESOLVED in v1.2.9** — Both auto-submit and draft pre-fill modes working natively.

---

## 🟡 Features In Progress / Partially Done

- [x] **Master Toggle — Implementation**
  - The Master Toggle (Enable/Disable all extension features) has been successfully implemented across: sidebar, status bar, and all commands. UI elements are hidden via `package.json` `when` clauses.

- [x] **Skill Management — Delete & Edit UI**
  - Added delete and edit functionality to skill cards with dedicated icons in the dashboard.

- [x] **Category Sync to Sidebar**
  - Ensured manual synchronization after category creation and deletion by triggering `_syncWebview()`.

- [ ] **Publisher License Gate — Multi-Seat Check**
  - Current license gate checks a single master key from Remote Config
  - Future: support per-user seat-based license keys validated against Firebase

---

## 🟢 Polish & UX Improvements (Pending)

- [ ] **Webview Light Mode**
  - Light mode was partially implemented — verify that all components (cards, modals, skill panel) respect the user's VS Code theme token

- [ ] **Prompt Injection — Context-Aware Targeting**
  - Currently injects into the active editor's input. Should detect if the user is in Antigravity chat vs. a regular editor

- [ ] **Search / Filter in Prompt List**
  - Add a live search bar at the top of the prompt list in both the sidebar and webview dashboard

- [ ] **Drag-and-Drop Reordering**
  - Allow users to reorder prompts within a category via drag-and-drop in the webview

- [x] **Import / Export Prompts**
  - Implemented in v1.2.6/1.2.7. Users can export all prompts + categories as `.json` and re-import from `.json` or `.csv`.

- [ ] **Keyboard Shortcut Customization**
  - Let users configure which keybinding triggers the Quick Prompt picker from VS Code settings

- [ ] **Status Bar Favorites — Quick-Click Injection**
  - Verify that clicking a favorite in the status bar triggers the correct injection mode (auto vs. draft) based on the `autoSubmit` setting

- [ ] **Dashboard Auto-Submit Toggle — Visual Polish**
  - Add a more prominent visual indicator (e.g., colored badge/glow) for the auto-submit toggle state in the webview dashboard

---

## 🔵 Future Vision / Big Features

- [ ] **Skills as First-Class Marketplace**
  - Allow premium users to browse and install community-shared Skills from a public registry (backed by Firebase)

- [ ] **Prompt Analytics Dashboard**
  - Track which prompts are used most, show usage frequency trends in the webview

- [ ] **AI-Generated Prompt Suggestions**
  - Based on the user's current file context, suggest relevant prompts using a lightweight AI call (Groq)

- [ ] **Multi-Workspace Support**
  - Add workspace-scoped prompt sets that activate only in specific projects

- [ ] **VS Code Marketplace Publishing**
  - Finalize publisher account setup, update `package.json` publisher field, and submit v1.3.0 to the VS Code Marketplace

- [ ] **Prompt Versioning / History**
  - Track edits to prompts over time so users can revert to previous versions

- [ ] **Prompt Chaining**
  - Allow users to define multi-step prompt sequences that execute in order

---

## ✅ Completed (Recent Sessions)

- [x] v1.2.9 — Bump version and package new release VSIX
- [x] v1.2.9 — Unified native prompt injection with boolean flag for draft and auto-submit
- [x] v1.2.8 — Add Auto-Submit toggle to dashboard and support selective auto-submit/draft-prefill strategies
- [x] v1.2.8 — Pre-fill the chat input as a draft instead of sending immediately
- [x] v1.2.7 — Ensure Antigravity side panel is open and focused before native prompt injection
- [x] v1.2.7 — Replace automatic prompt injection with robust focus-and-paste pipeline
- [x] v1.2.7 — Unlimited favorites, export/import prompts, improved delete flow and UI tweaks
- [x] v1.2.4 — Cleaned up old `.vsix` files, keep only latest
- [x] v1.2.4 — White pill "Sync" button in header with dark text for proper contrast
- [x] v1.2.3 — Removed sidebar Login-to-Sync button (consolidated to header)
- [x] v1.2.2 — Real license gate with Remote Config master key
- [x] v1.2.2 — Fixed skill favorite save bug (preserved `linkedSkill` field)
- [x] v1.2.2 — Free-tier seed fix for first-install experience
- [x] Google Drive AppData sync architecture (private per-user storage)
- [x] Custom Google OAuth provider with SecretStorage token persistence
- [x] Master Toggle switch in webview dashboard
- [x] Skills feature — create, link to prompts, favorite
- [x] Deep Dive Guide & Product Guide documentation

---

> **Resume Point (2026-05-18):** Prompt injection is **FULLY WORKING** in both **Auto-Submit mode** and **Draft/Pre-fill mode** as of v1.2.9. The `quickPrompt.autoSubmit` setting controls the behavior. Next session: pick up from the **🟢 Polish & UX** section — start with **Search/Filter**, **Light Mode verification**, or **Publisher License Gate**.
