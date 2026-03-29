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
exports.StorageService = void 0;
const vscode = __importStar(require("vscode"));
const STORE_KEY = 'quickPrompt.store';
// Seed data shown on first install
const DEFAULT_PROMPTS = [
    {
        id: 'default-1',
        title: '🐛 Debug This Code',
        content: 'Please review the following code, identify any bugs, explain what is wrong, and provide a corrected version with comments:\n\n{{selection}}',
        category: 'Debugging',
        isFavorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
    },
    {
        id: 'default-2',
        title: '📖 Explain Code',
        content: 'Please explain the following code in simple language. Describe what it does, how it works, and any important patterns used:\n\n{{selection}}',
        category: 'Learning',
        isFavorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
    },
    {
        id: 'default-3',
        title: '✨ Refactor & Optimize',
        content: 'Please refactor the following code to improve readability, performance, and follow best practices. Explain each major change:\n\n{{selection}}',
        category: 'Refactoring',
        isFavorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
    },
    {
        id: 'default-4',
        title: '🧪 Write Unit Tests',
        content: 'Generate comprehensive unit tests for the following code. Include edge cases, happy paths, and error scenarios:\n\n{{selection}}',
        category: 'Testing',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
    },
    {
        id: 'default-5',
        title: '📝 Write Documentation',
        content: 'Write clear and comprehensive documentation (JSDoc / docstring) for the following code. Include parameter descriptions, return types, and usage examples:\n\n{{selection}}',
        category: 'Documentation',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
    },
    {
        id: 'default-6',
        title: '🔒 Security Review',
        content: 'Perform a security review of the following code. Identify vulnerabilities, potential attack vectors, and provide recommendations to harden the code:\n\n{{selection}}',
        category: 'Security',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
    },
    {
        id: 'default-7',
        title: '🌐 Convert to Another Language',
        content: 'Convert the following code to [TARGET_LANGUAGE]. Maintain the same logic, structure, and functionality. Add comments to explain any language-specific differences:\n\n{{selection}}',
        category: 'Conversion',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
    },
];
const DEFAULT_CATEGORIES = [
    { id: 'cat-debugging', name: 'Debugging', createdAt: Date.now() },
    { id: 'cat-learning', name: 'Learning', createdAt: Date.now() },
    { id: 'cat-refactoring', name: 'Refactoring', createdAt: Date.now() },
    { id: 'cat-testing', name: 'Testing', createdAt: Date.now() },
    { id: 'cat-documentation', name: 'Documentation', createdAt: Date.now() },
    { id: 'cat-security', name: 'Security', createdAt: Date.now() },
    { id: 'cat-conversion', name: 'Conversion', createdAt: Date.now() },
];
class StorageService {
    constructor(context) {
        this._onChange = new vscode.EventEmitter();
        this.onDidChange = this._onChange.event;
        // --- License Management ---
        // Publisher master key — only Toolsbird knows this. Keep it secret, keep it safe.
        // Never commit the real value to a public repo; rotate it if ever exposed.
        this._PUBLISHER_MASTER_KEY = 'TB-QP-MASTER-7f3a2b9c1e4d8f6a0b5c3d2e1f4a7b8c9d0e2f3a4b5c6d7e8f9a0b1c2d3e4f';
        // --- GitHub Gist Cloud Sync (VS Code native auth) ---
        this._GIST_FILENAME = 'quick-prompt-backup.json';
        this._GIST_DESCRIPTION = 'Quick Prompt — Antigravity Extension Backup';
        this._GITHUB_SCOPES = ['gist'];
        this._context = context;
        this._seedIfEmpty();
        // Check for a dev flag if available (mocking environment check)
        if (process.env.DEBUG === 'true' || context.extensionMode === vscode.ExtensionMode.Development) {
            const store = this._getStore();
            if (!store.isPro) {
                store.isPro = true;
                store.licenseKey = 'DEV-INTERNAL-LICENSE';
                this._saveStore(store);
            }
        }
    }
    async _seedIfEmpty() {
        const store = this._context.globalState.get(STORE_KEY);
        if (!store || (store.prompts.length === 0 && (!store.skills || store.skills.length === 0))) {
            await this._context.globalState.update(STORE_KEY, {
                prompts: DEFAULT_PROMPTS,
                categories: DEFAULT_CATEGORIES,
                skills: [
                    {
                        id: 'skill-dev-guidelines',
                        name: '🛠️ Clean Code Guidelines',
                        content: 'Always prefer functional patterns. Use TypeScript strictly. Follow SOLID principles. No legacy "var" usage. Documentation must follow JSDoc standards.',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        isFavorite: true,
                    }
                ],
                isPro: false,
                licenseKey: '',
            });
            this._onChange.fire();
        }
    }
    _getStore() {
        const store = this._context.globalState.get(STORE_KEY);
        if (!store) {
            return {
                prompts: [],
                categories: [],
                skills: [],
            };
        }
        return store;
    }
    async _saveStore(store) {
        await this._context.globalState.update(STORE_KEY, store);
        this._onChange.fire();
    }
    // --- Prompt CRUD ---
    getPrompts() {
        return this._getStore().prompts;
    }
    getFavoritePrompts() {
        return this._getStore().prompts.filter((p) => p.isFavorite);
    }
    getPromptsByCategory(categoryName) {
        return this._getStore().prompts.filter((p) => p.category === categoryName);
    }
    async addPrompt(prompt) {
        const store = this._getStore();
        // PREMIUM CHECK: Limit non-pro users to 10 prompts
        if (!store.isPro && store.prompts.length >= 10) {
            throw new Error('🚀 You have reached the limit for free prompts (10). Upgrade to Pro for unlimited prompts!');
        }
        const newPrompt = {
            ...prompt,
            id: `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            useCount: 0,
        };
        store.prompts.push(newPrompt);
        await this._saveStore(store);
        return newPrompt;
    }
    async updatePrompt(id, updates) {
        const store = this._getStore();
        const idx = store.prompts.findIndex((p) => p.id === id);
        if (idx !== -1) {
            store.prompts[idx] = {
                ...store.prompts[idx],
                ...updates,
                updatedAt: Date.now(),
            };
            await this._saveStore(store);
        }
    }
    async deletePrompt(id) {
        const store = this._getStore();
        store.prompts = store.prompts.filter((p) => p.id !== id);
        await this._saveStore(store);
    }
    async toggleFavorite(id) {
        const store = this._getStore();
        const prompt = store.prompts.find((p) => p.id === id);
        if (prompt) {
            prompt.isFavorite = !prompt.isFavorite;
            prompt.updatedAt = Date.now();
            await this._saveStore(store);
            return prompt.isFavorite;
        }
        return false;
    }
    async incrementUseCount(id) {
        const store = this._getStore();
        const prompt = store.prompts.find((p) => p.id === id);
        if (prompt) {
            prompt.useCount = (prompt.useCount || 0) + 1;
            await this._saveStore(store);
        }
    }
    // --- Category CRUD ---
    getCategories() {
        return this._getStore().categories;
    }
    async addCategory(name) {
        const store = this._getStore();
        const existing = store.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            throw new Error(`Category "${name}" already exists`);
        }
        const newCat = {
            id: `cat-${Date.now()}`,
            name,
            createdAt: Date.now(),
        };
        store.categories.push(newCat);
        await this._saveStore(store);
        return newCat;
    }
    async deleteCategory(name) {
        const store = this._getStore();
        if (name === 'Uncategorized')
            return;
        // Move prompts in this category to "Uncategorized"
        store.prompts = store.prompts.map((p) => p.category === name ? { ...p, category: 'Uncategorized' } : p);
        // Remove the category
        store.categories = store.categories.filter((c) => c.name !== name);
        // Ensure "Uncategorized" exists as a fallback
        if (!store.categories.find((c) => c.name === 'Uncategorized')) {
            store.categories.push({
                id: 'cat-uncategorized',
                name: 'Uncategorized',
                createdAt: Date.now(),
            });
        }
        await this._saveStore(store);
    }
    async renameCategory(oldName, newName) {
        const store = this._getStore();
        const cat = store.categories.find((c) => c.name === oldName);
        if (cat) {
            cat.name = newName;
        }
        store.prompts = store.prompts.map((p) => p.category === oldName ? { ...p, category: newName } : p);
        await this._saveStore(store);
    }
    isPro() {
        return !!this._getStore().isPro;
    }
    async activatePro(key) {
        const trimmed = key.trim();
        // Publisher master key: always grants Pro without a server call.
        if (trimmed === this._PUBLISHER_MASTER_KEY) {
            const store = this._getStore();
            store.isPro = true;
            store.licenseKey = trimmed;
            await this._saveStore(store);
            return true;
        }
        // TODO: Replace the block below with a real licensing API call
        // (e.g. LemonSqueezy / Gumroad) before public release.
        // Example:
        //   const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        //     method: 'POST', body: JSON.stringify({ license_key: trimmed }), ... });
        //   if (res.ok && (await res.json()).valid) { ... grant pro ... }
        //
        // For now: reject all keys that are not the publisher master key.
        return false;
    }
    // --- Skill CRUD ---
    getSkills() {
        return this._getStore().skills || [];
    }
    async addSkill(skill) {
        const store = this._getStore();
        const newSkill = {
            ...skill,
            id: `skill-${Date.now()}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        if (!store.skills)
            store.skills = [];
        store.skills.push(newSkill);
        await this._saveStore(store);
        return newSkill;
    }
    async updateSkill(id, updates) {
        const store = this._getStore();
        if (!store.skills)
            return;
        const idx = store.skills.findIndex((s) => s.id === id);
        if (idx !== -1) {
            store.skills[idx] = {
                ...store.skills[idx],
                ...updates,
                updatedAt: Date.now(),
            };
            await this._saveStore(store);
        }
    }
    async deleteSkill(id) {
        const store = this._getStore();
        if (!store.skills)
            return;
        store.skills = store.skills.filter((s) => s.id !== id);
        // Unlink from prompts
        store.prompts = store.prompts.map((p) => p.skillId === id ? { ...p, skillId: undefined } : p);
        await this._saveStore(store);
    }
    async toggleSkillFavorite(id) {
        const store = this._getStore();
        if (!store.skills)
            return false;
        const skill = store.skills.find((s) => s.id === id);
        if (skill) {
            skill.isFavorite = !skill.isFavorite;
            skill.updatedAt = Date.now();
            await this._saveStore(store); // Persist the toggled state
            return skill.isFavorite;
        }
        return false;
    }
    /**
     * Checks if the user is already signed into GitHub without prompting.
     */
    async checkLoggedIn() {
        try {
            const session = await vscode.authentication.getSession('github', this._GITHUB_SCOPES, { silent: true });
            return !!session;
        }
        catch {
            return false;
        }
    }
    /**
     * Triggers the native VS Code GitHub sign-in flow (opens the browser via VS Code's own OAuth).
     */
    async login() {
        try {
            const session = await vscode.authentication.getSession('github', this._GITHUB_SCOPES, { createIfNone: true });
            return !!session;
        }
        catch (e) {
            console.error('[Quick Prompt] GitHub login failed:', e);
            return false;
        }
    }
    /**
     * Syncs prompts with a secret GitHub Gist (like WhatsApp Drive backup, but on GitHub).
     * - If no gist exists: creates a new secret gist with current data.
     * - If gist exists: merges remote + local and updates the gist.
     */
    async syncWithCloud() {
        try {
            // 1. Get GitHub session (silent — user must have logged in already)
            const session = await vscode.authentication.getSession('github', this._GITHUB_SCOPES, { silent: true });
            if (!session) {
                return { success: false, message: 'Please login first using the "Login to Sync" button.' };
            }
            const token = session.accessToken;
            const headers = {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            };
            // 2. Find existing backup gist
            const listRes = await fetch('https://api.github.com/gists', { headers });
            if (!listRes.ok) {
                throw new Error(`GitHub API error: ${listRes.status} ${listRes.statusText}`);
            }
            const allGists = await listRes.json();
            const existingGist = allGists.find((g) => g.files && g.files[this._GIST_FILENAME]);
            const localStore = this._getStore();
            if (existingGist) {
                // 3. Download full gist content (list API truncates files)
                const gistRes = await fetch(`https://api.github.com/gists/${existingGist.id}`, { headers });
                if (!gistRes.ok)
                    throw new Error(`Failed to fetch gist: ${gistRes.status}`);
                const gistData = await gistRes.json();
                const rawContent = gistData.files?.[this._GIST_FILENAME]?.content;
                if (!rawContent)
                    throw new Error('Backup file was empty or missing in the gist.');
                const remoteStore = JSON.parse(rawContent);
                // 4. Merge — prefer newest version of each item by updatedAt
                const mergedPrompts = [...localStore.prompts];
                (remoteStore.prompts || []).forEach(rp => {
                    const localIdx = mergedPrompts.findIndex(lp => lp.id === rp.id);
                    if (localIdx === -1) {
                        mergedPrompts.push(rp); // New remote prompt
                    }
                    else if ((rp.updatedAt || 0) > (mergedPrompts[localIdx].updatedAt || 0)) {
                        mergedPrompts[localIdx] = rp; // Remote is newer
                    }
                });
                const mergedSkills = [...(localStore.skills || [])];
                (remoteStore.skills || []).forEach(rs => {
                    const localIdx = mergedSkills.findIndex(ls => ls.id === rs.id);
                    if (localIdx === -1) {
                        mergedSkills.push(rs);
                    }
                    else if ((rs.updatedAt || 0) > (mergedSkills[localIdx].updatedAt || 0)) {
                        mergedSkills[localIdx] = rs;
                    }
                });
                localStore.prompts = mergedPrompts;
                localStore.skills = mergedSkills;
                await this._saveStore(localStore);
                // 5. Push merged data back to gist
                const patchRes = await fetch(`https://api.github.com/gists/${existingGist.id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        files: {
                            [this._GIST_FILENAME]: {
                                content: JSON.stringify(localStore, null, 2)
                            }
                        }
                    })
                });
                if (!patchRes.ok)
                    throw new Error(`Failed to update gist: ${patchRes.status}`);
                return { success: true, message: `✅ Sync complete! ${mergedPrompts.length} prompts synced.` };
            }
            else {
                // 6. No gist yet — create a new secret gist
                const createRes = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        description: this._GIST_DESCRIPTION,
                        public: false, // Secret gist — only accessible with token
                        files: {
                            [this._GIST_FILENAME]: {
                                content: JSON.stringify(localStore, null, 2)
                            }
                        }
                    })
                });
                if (!createRes.ok) {
                    const err = await createRes.text();
                    throw new Error(`Failed to create backup: ${createRes.status} — ${err}`);
                }
                return { success: true, message: `✅ Backup created! ${localStore.prompts.length} prompts saved to your private GitHub storage.` };
            }
        }
        catch (e) {
            console.error('[Quick Prompt Sync Error]', e);
            return { success: false, message: `Sync failed: ${e.message}` };
        }
    }
}
exports.StorageService = StorageService;
