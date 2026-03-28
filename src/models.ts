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
}

export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface PromptStore {
  prompts: Prompt[];
  categories: Category[];
}
