export enum VisibilityType {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export interface Prompt {
  // The prompt ID.
  id: number;

  // The prompt title.
  title: string;

  // Optional description of the prompt.
  description?: string;

  // The actual prompt content.
  content: string;

  // Visibility setting for the prompt.
  visibility: VisibilityType;

  // Optional rating for the prompt.
  rating?: number;

  // Associated categories.
  categories?: PromptCategory[];

  // Creation timestamp.
  createdAt: Date;

  // Last update timestamp.
  updatedAt: Date;
}

export interface PromptCategory {
  // The category label (primary key).
  label: string;

  // Optional description of the category.
  description?: string;

  // Manual creation date field.
  creationDate: Date;

  // Visibility setting for the category.
  visibility: VisibilityType;

  // Creation timestamp.
  createdAt: Date;

  // Last update timestamp.
  updatedAt: Date;
}
