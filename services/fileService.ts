
import { Note, EditorJsOutputData, EditorJsBlock, AppSettings, MyNotesExportData } from '../types';

// Helper to convert Editor.js block data to text for TXT export
const blockToPlainText = (block: EditorJsBlock): string => {
  switch (block.type) {
    case 'header':
      return `${'#'.repeat(block.data.level || 1)} ${block.data.text}\n`;
    case 'paragraph':
      return `${block.data.text}\n`;
    case 'list':
      const listPrefix = block.data.style === 'ordered' ? '1. ' : '* ';
      return block.data.items.map((item: string) => `${listPrefix}${item}`).join('\n') + '\n';
    case 'quote':
      return `> ${block.data.text}\n${block.data.caption ? `> -- ${block.data.caption}\n` : ''}`;
    case 'code':
      return `\`\`\`${block.data.language || ''}\n${block.data.code}\n\`\`\`\n`;
    case 'delimiter':
      return '---\n';
    case 'image':
      let caption = block.data.caption ? `\n*${block.data.caption}*` : '';
      return `![${block.data.alt || 'Image'}](${block.data.url})${caption}\n`;
    case 'checklist':
      return block.data.items.map((item: {text: string, checked: boolean}) => `[${item.checked ? 'x' : ' '}] ${item.text}`).join('\n') + '\n';
    case 'table':
      // Basic table to text conversion, could be improved for complex tables
      if (block.data.withHeadings && block.data.content && block.data.content[0]) {
        const header = block.data.content[0].join(' | ');
        const separator = block.data.content[0].map(() => '---').join(' | ');
        const body = block.data.content.slice(1).map((row: string[]) => row.join(' | ')).join('\n');
        return `${header}\n${separator}\n${body}\n`;
      }
      return block.data.content?.map((row: string[]) => row.join('\t')).join('\n') + '\n' || ''; // Fallback to tab separated
    case 'warning':
      return `**${block.data.title || 'Warning'}**: ${block.data.message}\n`;
    default:
      // Attempt to get text from unknown blocks if 'text' property exists
      if (block.data && typeof block.data.text === 'string') {
        return `${block.data.text}\n`;
      }
      return '';
  }
};

// Helper to convert Editor.js OutputData to Markdown
const editorDataToMarkdown = (data: EditorJsOutputData): string => {
  if (!data || !Array.isArray(data.blocks)) return '';
  return data.blocks.map(blockToPlainText).join('\n'); // blockToPlainText already generates markdown-like syntax
};

// Helper to convert Editor.js OutputData to plain text
const editorDataToPlainText = (data: EditorJsOutputData): string => {
    if (!data || !Array.isArray(data.blocks)) return '';
    return data.blocks.map(block => {
      // Simpler plain text conversion
      switch (block.type) {
        case 'header': return `${block.data.text}\n\n`;
        case 'paragraph': return `${block.data.text}\n\n`;
        case 'list': return block.data.items.map((item: string) => `- ${item}`).join('\n') + '\n\n';
        case 'quote': return `"${block.data.text}" ${block.data.caption ? `- ${block.data.caption}` : ''}\n\n`;
        case 'code': return `${block.data.code}\n\n`;
        case 'delimiter': return `----------\n\n`;
        case 'image': return `(Image: ${block.data.url} ${block.data.caption ? `- ${block.data.caption}` : ''})\n\n`;
        case 'checklist': return block.data.items.map((item: {text:string, checked:boolean}) => `[${item.checked ? 'x' : ' '}] ${item.text}`).join('\n') + '\n\n';
        case 'table': return block.data.content?.map((row: string[]) => row.join('\t')).join('\n') + '\n\n' || '';
        case 'warning': return `Warning: ${block.data.title} - ${block.data.message}\n\n`;
        default: 
            if (block.data && typeof block.data.text === 'string') return `${block.data.text}\n\n`;
            return '';
      }
    }).join('');
};

export const exportNotesAsJSON = (notes: Note[], settings: AppSettings, filename: string = 'mynotes_export.json'): void => {
  const exportData: MyNotesExportData = {
    version: 2, // Current version with notes and settings
    notes,
    settings,
  };
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportNoteAsMarkdown = (note: Note, filename?: string): void => {
  const titleHeader = `# ${note.title}\n\n`;
  const tagsHeader = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}\n\n` : '';
  const markdownContent = titleHeader + tagsHeader + editorDataToMarkdown(note.content);
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportNoteAsTXT = (note: Note, filename?: string): void => {
  const titleHeader = `Title: ${note.title}\n\n`;
  const tagsHeader = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}\n\n` : '';
  const txtContent = titleHeader + tagsHeader + editorDataToPlainText(note.content);
  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


export const importNotesFromJSON = (file: File): Promise<{ notes: Note[]; settings?: AppSettings }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const parsedJson = JSON.parse(jsonString);
        
        let notesToImport: Note[] = [];
        let settingsToImport: AppSettings | undefined = undefined;
        let rawNotesArray: Array<Partial<Note> & { content: string | EditorJsOutputData }> = [];

        if (Array.isArray(parsedJson)) { // Old format: array of notes (version 1 implicitly)
          rawNotesArray = parsedJson;
        } else if (parsedJson && typeof parsedJson === 'object') {
          if (parsedJson.version === 2 && Array.isArray(parsedJson.notes) && parsedJson.settings) { // New format with version 2
            rawNotesArray = parsedJson.notes;
            settingsToImport = parsedJson.settings as AppSettings;
          } else if (Array.isArray(parsedJson.notes)) { // New format but maybe missing version or settings, treat as notes-only
             console.warn("Imported JSON has 'notes' array but not fully recognized 'MyNotesExportData' v2 format. Importing notes only.");
             rawNotesArray = parsedJson.notes;
          } else {
            reject(new Error('Invalid JSON file format: Expected an array of notes or a valid export object with a "notes" array.'));
            return;
          }
        } else {
           reject(new Error('Invalid JSON file format: Not an array or recognizable object.'));
           return;
        }

        notesToImport = rawNotesArray.map((n, index) => {
          if (!n.id || typeof n.title !== 'string') { // Allow empty title string
            throw new Error(`Invalid note structure at index ${index}: missing id or title is not a string.`);
          }
          
          let processedContent: EditorJsOutputData;
          if (typeof n.content === 'string') { // Handle old string content
            processedContent = {
              blocks: [{ type: 'paragraph', data: { text: n.content } }],
              time: Date.now(),
              version: "2.29.0" // Example version
            };
          } else if (n.content && Array.isArray(n.content.blocks)) { // Assume it's EditorJsOutputData
            processedContent = n.content;
          } else { // Default to empty content if invalid
             processedContent = { blocks: [{ type: 'paragraph', data: { text: '' } }], time: Date.now(), version: "2.29.0" };
          }

          return {
            id: n.id,
            title: n.title,
            content: processedContent,
            tags: Array.isArray(n.tags) ? n.tags.filter(t => typeof t === 'string') : [],
            createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
            updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
          };
        });
        resolve({ notes: notesToImport, settings: settingsToImport });

      } catch (error) {
        reject(new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read the file.'));
    };
    reader.readAsText(file);
  });
};