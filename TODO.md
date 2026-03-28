# Quick Prompt Antigravity Extension — TODO List
> Last updated: 2026-03-28 | Current version: **v1.2.4** | Branch: `main`

---

## 🔴 Critical / Must Fix

- [ ] **Google Drive Sync — Login Flow Reliability**
  - The `loginToSync()` / OAuth flow intermittently shows "Please login first" even after a successful sign-in
  - Root cause: custom Google OAuth provider loses session state on popup close before token is persisted
  - Need to verify token is fully written to `SecretStorage` before updating UI state
  - Consider switching to a persistent token cache pattern

- [ ] **Free-Tier Seed Race Condition**
  - On first install, if the extension activates before `seed-free-tier` completes, the user sees an empty prompt list
  - Add a proper loading/skeleton state in the webview until storage is confirmed initialized

- [ ] **Skill-to-Prompt Link — Favorite Save Bug**
  - Already patched in v1.2.2 but needs E2E verification: saving a skill as favorite while linked to a prompt should not drop the `linkedSkill` field from storage

---

## 🟡 Features In Progress / Partially Done

- [ ] **Master Toggle — Full E2E Test**
  - The Master Toggle (Enable/Disable all extension features) was implemented but not fully tested across: sidebar, status bar, command palette, and keybinding injection
  - Verify that toggling OFF truly suppresses all Quick Prompt activity

- [ ] **Skill Management — Delete & Edit UI**
  - Skills can be created and favorited but **cannot be deleted or edited** from the UI yet
  - Add edit pencil icon and delete trash icon in the skill card row

- [ ] **Category Sync to Sidebar**
  - New categories created in the webview dashboard do not always appear immediately in the VS Code sidebar tree view without a manual refresh
  - Fix: fire `refresh` event on the `PromptTreeProvider` immediately after category creation in storage

- [ ] **Publisher License Gate — Multi-Seat Check**
  - Current license gate checks a single master key from Remote Config
  - Future: support per-user seat-based license keys validated against Firebase

---

## 🟢 Polish & UX Improvements

- [ ] **Webview Light Mode**
  - Light mode was partially implemented — verify that all components (cards, modals, skill panel) respect the user's VS Code theme token

- [ ] **Prompt Injection — Context-Aware Targeting**
  - Currently injects into the active editor's input. Should detect if the user is in Antigravity chat vs. a regular editor

- [ ] **Search / Filter in Prompt List**
  - Add a live search bar at the top of the prompt list in both the sidebar and webview dashboard

- [ ] **Drag-and-Drop Reordering**
  - Allow users to reorder prompts within a category via drag-and-drop in the webview

- [ ] **Import / Export Prompts**
  - Allow users to export all prompts + categories as a `.json` file and re-import them (backup + cross-device without Drive)

- [ ] **Keyboard Shortcut Customization**
  - Let users configure which keybinding triggers the Quick Prompt picker from VS Code settings

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

---

## ✅ Completed (Recent Sessions)

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

> **Resume Point:** Start next session with the 🔴 Critical items, especially verifying the Google Drive Login flow end-to-end in a clean VS Code environment.
