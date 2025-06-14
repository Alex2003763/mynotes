
// No longer EditorJsOutputData
// import { EditorJsOutputData, EditorJsBlock } from '../types'; 

/**
 * Converts Markdown string to a plain text string, suitable for AI processing.
 * This can be a simple pass-through or include Markdown-to-text conversion logic.
 * For now, it will be a simple pass-through, assuming AI can handle Markdown or it's pre-processed.
 * A more robust solution would use a Markdown parsing library to strip formatting.
 * @param markdown The Markdown string.
 * @returns A string representation of the note content.
 */
export const editorJsDataToTextForAI = (markdown: string | undefined | null): string => {
  if (!markdown) {
    return '';
  }
  // For now, return the Markdown directly.
  // If AI has trouble with Markdown syntax, this function can be enhanced
  // to strip Markdown formatting to plain text. Example basic stripping:
  // let text = markdown;
  // text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links, keep text
  // text = text.replace(/!\[(.*?)\]\(.*?\)/g, '$1'); // Remove images, keep alt text
  // text = text.replace(/(\*\*|__)(.*?)\1/g, '$2'); // Bold
  // text = text.replace(/(\*|_)(.*?)\1/g, '$2');   // Italic
  // text = text.replace(/^#+\s+/gm, '');        // Headings
  // text = text.replace(/^>\s+/gm, '');         // Blockquotes
  // text = text.replace(/^[\*\-\+]\s+/gm, '');    // List items
  // text = text.replace(/^(\s*)\d+\.\s+/gm, '$1'); // Ordered list items
  // text = text.replace(/`{1,3}(.*?)`{1,3}/g, '$1'); // Code
  return markdown;
};
