import { 
  summarizeTextStreaming as openRouterSummarizeTextStreaming,
  correctGrammarAndSpellingStreaming as openRouterCorrectGrammarAndSpellingStreaming,
  expandContentStreaming as openRouterExpandContentStreaming,
  answerQuestionFromNoteStreaming as openRouterAnswerQuestionFromNoteStreaming,
  suggestTags as openRouterSuggestTags
} from './openRouterService';

import {
  summarizeTextStreaming as geminiSummarizeTextStreaming,
  correctGrammarAndSpellingStreaming as geminiCorrectGrammarAndSpellingStreaming,
  expandContentStreaming as geminiExpandContentStreaming,
  answerQuestionFromNoteStreaming as geminiAnswerQuestionFromNoteStreaming,
  suggestTags as geminiSuggestTags
} from './geminiService';

export type AIProvider = 'openrouter' | 'gemini';

export const summarizeTextStreaming = async (
  text: string,
  length: 'short' | 'bullet',
  language: 'en' | 'zh' = 'en',
  modelIdOrProvider: string,
  provider: AIProvider,
  customSystemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  if (provider === 'openrouter') {
    return openRouterSummarizeTextStreaming(text, length, language, modelIdOrProvider, onChunk);
  } else {
    return geminiSummarizeTextStreaming(text, length, language, modelIdOrProvider, customSystemPrompt, onChunk);
  }
};

export const correctGrammarAndSpellingStreaming = async (
  text: string,
  language: 'en' | 'zh' = 'en',
  modelIdOrProvider: string,
  provider: AIProvider,
  customSystemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  if (provider === 'openrouter') {
    return openRouterCorrectGrammarAndSpellingStreaming(text, language, modelIdOrProvider, onChunk);
  } else {
    return geminiCorrectGrammarAndSpellingStreaming(text, language, modelIdOrProvider, customSystemPrompt, onChunk);
  }
};

export const expandContentStreaming = async (
  selectedText: string,
  instruction: string,
  language: 'en' | 'zh' = 'en',
  modelIdOrProvider: string,
  provider: AIProvider,
  customSystemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  if (provider === 'openrouter') {
    return openRouterExpandContentStreaming(selectedText, instruction, language, modelIdOrProvider, onChunk);
  } else {
    return geminiExpandContentStreaming(selectedText, instruction, language, modelIdOrProvider, customSystemPrompt, onChunk);
  }
};

export const answerQuestionFromNoteStreaming = async (
  question: string,
  noteContent: string,
  language: 'en' | 'zh' = 'en',
  modelIdOrProvider: string,
  provider: AIProvider,
  customSystemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  if (provider === 'openrouter') {
    return openRouterAnswerQuestionFromNoteStreaming(question, noteContent, language, modelIdOrProvider, onChunk);
  } else {
    return geminiAnswerQuestionFromNoteStreaming(question, noteContent, language, modelIdOrProvider, customSystemPrompt, onChunk);
  }
};

export const suggestTags = async (
  noteContent: string,
  language: 'en' | 'zh' = 'en',
  modelIdOrProvider: string,
  provider: AIProvider,
  customSystemPrompt: string = ''
): Promise<string[]> => {
  if (provider === 'openrouter') {
    return openRouterSuggestTags(noteContent, language, modelIdOrProvider);
  } else {
    return geminiSuggestTags(noteContent, language, modelIdOrProvider, customSystemPrompt);
  }
};