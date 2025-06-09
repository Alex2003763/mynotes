
export interface EditorJsBlock {
  id?: string;
  type: string;
  data: any;
  tunes?: { [name: string]: any };
}

export interface EditorJsOutputData {
  time?: number;
  blocks: EditorJsBlock[];
  version?: string;
}

export interface Note {
  id: string;
  title: string;
  content: EditorJsOutputData; // Changed from string to EditorJsOutputData
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  name: string;
  count: number; 
}

export enum SortOption {
  CreatedAtDesc = 'createdAtDesc',
  CreatedAtAsc = 'createdAtAsc',
  UpdatedAtDesc = 'updatedAtDesc',
  UpdatedAtAsc = 'updatedAtAsc',
  TitleAsc = 'titleAsc',
  TitleDesc = 'titleDesc',
}

export type Language = 'en' | 'zh';

export interface AvailableAIModel {
  id: string;
  name: string;
  provider?: string; // Optional: To group models by provider in UI if needed
}

export interface AppSettings {
  key: string; 
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large'; // Font size might apply less directly to Editor.js content
  defaultSort: SortOption;
  openRouterApiKey: string;
  openRouterApiKeyStatus: 'unset' | 'checking' | 'valid' | 'invalid' | 'set';
  language: Language;
  primaryColor: string;
  aiModel: string; // ID of the selected AI model
  // autosaveDelay: number; // Delay in milliseconds for autosave - REMOVED
}

export interface MyNotesExportData {
  version: number; // For future format changes, e.g., 1 for notes-only, 2 for notes+settings
  notes: Note[];
  settings: AppSettings;
}

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterChoice {
  message: {
    role: string;
    content: string;
  };
}
export interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface Candidate {
  content: {
    parts: { text: string }[]; 
    role: string;
  };
  finishReason: string;
  index: number;
  safetyRatings: any[]; 
  groundingMetadata?: GroundingMetadata;
}

export interface GenerateContentResponse {
  text: string; 
  candidates?: Candidate[];
}

export type ApiFeedbackMessageType = 'success' | 'error' | 'info';

export interface ApiFeedback {
  type: ApiFeedbackMessageType;
  text: string;
}

// Translation related types
export type TranslationKey = string; // Dot-separated key, e.g., "header.title"
export type Translations = Record<TranslationKey, string | Record<string, string>>; // Allow nested structure