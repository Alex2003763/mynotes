
import { AvailableAIModel } from './types';

export const DB_NAME = 'MyNotesDB';
export const NOTES_STORE_NAME = 'notes';
export const TAGS_STORE_NAME = 'tags'; 
export const SETTINGS_STORE_NAME = 'settings';
export const DB_VERSION = 1; 


export const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';

// List of available AI models for user selection
// Refer to https://openrouter.ai/docs#models for a list of models
export const AVAILABLE_AI_MODELS: AvailableAIModel[] = [
  { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 0528 (Free)' },
  { id: 'mistralai/mistral-7b-instruct-v0.2', name: 'Mistral 7B Instruct v0.2' },
  { id: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo', name: 'Nous Hermes 2 Mixtral 8x7B DPO' },
  { id: 'openai/gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo' },
  { id: 'google/gemini-pro', name: 'Google Gemini Pro' }, 
  { id: 'anthropic/claude-3-haiku-20240307', name: 'Anthropic Claude 3 Haiku'},
  { id: 'meta-llama/llama-3-8b-instruct', name: 'Meta Llama 3 8B Instruct'},
];

export const DEFAULT_AI_MODEL_ID = AVAILABLE_AI_MODELS[0].id; // Default to DeepSeek


export const DEFAULT_SETTINGS_KEY = 'appSettings';

// Predefined theme colors for the color board
export const PREDEFINED_THEME_COLORS: { name: string; hex: string }[] = [
  { name: 'Indigo (Default)', hex: '#4f46e5' },
  { name: 'Sky Blue', hex: '#0ea5e9' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Rose Pink', hex: '#f43f5e' },
  { name: 'Amber Orange', hex: '#f59e0b' },
  { name: 'Purple', hex: '#8b5cf6'},
];

export const EDITOR_HOLDER_ID = 'editorjs-container';