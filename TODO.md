# Quick Prompt Antigravity Extension — TODO List
> Last updated: 2026-03-29 | Current version: **v1.2.5** | Branch: `main`

---

## 🔴 Critical / Must Fix

- [x] **Sync Feature Consolidation**
  - Removed legacy Google Drive sync in favor of robust, native GitHub Gist synchronization.

- [x] **Free-Tier Seed Race Condition**
  - On first install, ensure default prompts are fully seeded before webview activation. (Fixed in v1.2.5)

- [x] **Skill-to-Prompt Link — Favorite Save Bug**
  - Already patched in v1.2.2 and verified: saving a skill as favorite while linked to a prompt preserves the `linkedSkill` field.

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

> **Resume Point:** Finalized v1.2.5. Verify GitHub Gist sync end-to-end in next session.
