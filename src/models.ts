// Prompt data model

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  useCount?: number;
  skillId?: string; // Optional: Link to a standalone skill
}

export interface Skill {
  id: string;
  name: string;
  content: string; // Detailed instructions/markdown
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
}

export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface PromptStore {
  prompts: Prompt[];
  categories: Category[];
  isPro?: boolean;
  licenseKey?: string;
  skills: Skill[]; // New Standalone Skills array
}
