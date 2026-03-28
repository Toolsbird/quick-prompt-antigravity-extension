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
        this._context = context;
        this._seedIfEmpty();
        // Force PRO for internal developer/this device
        const store = this._getStore();
        if (!store.isPro) {
            store.isPro = true;
            store.licenseKey = 'DEV-INTERNAL-LICENSE';
            this._saveStore(store);
        }
    }
    _seedIfEmpty() {
        const store = this._context.globalState.get(STORE_KEY);
        if (!store || store.prompts.length === 0) {
            this._context.globalState.update(STORE_KEY, {
                prompts: DEFAULT_PROMPTS,
                categories: DEFAULT_CATEGORIES,
                isPro: true, // INTERNAL DEV BUILD: Auto-activate PRO
                licenseKey: 'DEV-INTERNAL-LICENSE',
            });
        }
    }
    _getStore() {
        return (this._context.globalState.get(STORE_KEY) || {
            prompts: [],
            categories: [],
        });
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
            id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        // Move prompts in this category to "Uncategorized"
        store.prompts = store.prompts.map((p) => p.category === name ? { ...p, category: 'Uncategorized' } : p);
        store.categories = store.categories.filter((c) => c.name !== name);
        // Ensure Uncategorized exists
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
    // --- License Management ---
    isPro() {
        return !!this._getStore().isPro;
    }
    async activatePro(key) {
        // Simple verification for the simulation
        // In production, this would call your licensing server (e.g. Gumroad/LemonSqueezy)
        if (key.length >= 10) {
            const store = this._getStore();
            store.isPro = true;
            store.licenseKey = key;
            await this._saveStore(store);
            return true;
        }
        return false;
    }
}
exports.StorageService = StorageService;
