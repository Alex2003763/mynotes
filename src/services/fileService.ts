
import { Note, EditorJsOutputData, EditorJsBlock, AppSettings, MyNotesExportData } from '../types';

// Simplified local text-to-EditorJsOutputData converter
const localTextToEditorJsData = (text: string): EditorJsOutputData => {
  const paragraphs = text.split(/[\r\n]+/).map(p => p.trim());
  const blocks = paragraphs
    .map(paragraph => ({
      type: 'paragraph' as const,
      data: { text: paragraph },
    }));
  return {
    time: Date.now(),
    blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
    version: "2.30.0" // Match a known good version
  };
};

// Simplified local sanitizer for EditorJsOutputData on import
const localSanitizeImportedEditorData = (data: any): EditorJsOutputData => {
    const defaultVersion = "2.30.0";
    const defaultTime = Date.now();

    if (typeof data === 'string') {
        return localTextToEditorJsData(data);
    }

    if (!data || typeof data !== 'object' || !Array.isArray(data.blocks)) {
        return { time: defaultTime, blocks: [{ type: 'paragraph', data: { text: '' } }], version: defaultVersion };
    }

    const sanitizedBlocks = data.blocks.map((block: any) => {
        if (typeof block !== 'object' || block === null || typeof block.type !== 'string') {
            return { type: 'paragraph', data: { text: '' } }; // Default fallback
        }
        const blockData = (typeof block.data === 'object' && block.data !== null) ? { ...block.data } : {};

        switch (block.type) {
            case 'paragraph':
                if (typeof blockData.text !== 'string') blockData.text = '';
                break;
            case 'header':
                if (typeof blockData.text !== 'string') blockData.text = '';
                
                let level = parseInt(String(blockData.level), 10);
                if (isNaN(level) || level < 1 || level > 6) {
                  level = 2; // Default to H2
                }
                blockData.level = level;
                break;
            case 'list':
                if (!Array.isArray(blockData.items)) blockData.items = [];
                blockData.items = blockData.items.filter((item: any) => typeof item === 'string').map(String);
                if (!['ordered', 'unordered'].includes(blockData.style)) blockData.style = 'unordered';
                break;
             case 'image':
                if (typeof blockData.file !== 'object' || blockData.file === null || typeof blockData.file.url !== 'string') {
                    if (typeof blockData.url === 'string' && blockData.url) {
                         blockData.file = { url: blockData.url };
                    } else {
                         blockData.file = { url: '' }; 
                    }
                }
                if (typeof blockData.caption !== 'string') blockData.caption = '';
                break;
            // Add more common types if necessary for import robustness
        }
        return { ...block, data: blockData };
    });

    return {
        time: typeof data.time === 'number' ? data.time : defaultTime,
        blocks: sanitizedBlocks.length > 0 ? sanitizedBlocks : [{ type: 'paragraph', data: { text: '' } }],
        version: typeof data.version === 'string' ? data.version : defaultVersion,
    };
};


// Helper to convert Editor.js block data to text for TXT export (Markdown)
const blockToPlainTextForMarkdown = (block: EditorJsBlock): string => {
  switch (block.type) {
    case 'header':
      return `${'#'.repeat(block.data.level || 1)} ${block.data.text || ''}\n`;
    case 'paragraph':
      return `${block.data.text || ''}\n`;
    case 'list':
      const listPrefix = block.data.style === 'ordered' ? '1. ' : '* ';
      return (block.data.items || []).map((item: string) => `${listPrefix}${item}`).join('\n') + '\n';
    case 'quote':
      return `> ${block.data.text || ''}\n${block.data.caption ? `> -- ${block.data.caption}\n` : ''}`;
    case 'code':
      return `\`\`\`${block.data.language || ''}\n${block.data.code || ''}\n\`\`\`\n`;
    case 'delimiter':
      return '---\n';
    case 'image':
      let caption = block.data.caption ? `\n*${block.data.caption}*` : '';
      return `![${block.data.alt || 'Image'}](${block.data.file?.url || block.data.url || ''})${caption}\n`;
    case 'checklist':
      return (block.data.items || []).map((item: {text: string, checked: boolean}) => `[${item.checked ? 'x' : ' '}] ${item.text || ''}`).join('\n') + '\n';
    case 'table':
      if (block.data.withHeadings && block.data.content && block.data.content[0]) {
        const header = (block.data.content[0] || []).join(' | ');
        const separator = (block.data.content[0] || []).map(() => '---').join(' | ');
        const body = (block.data.content.slice(1) || []).map((row: string[]) => (row || []).join(' | ')).join('\n');
        return `${header}\n${separator}\n${body}\n`;
      }
      return (block.data.content || []).map((row: string[]) => (row || []).join('\t')).join('\n') + '\n';
    case 'warning':
      return `**${block.data.title || 'Warning'}**: ${block.data.message || ''}\n`;
    default:
      if (block.data && typeof block.data.text === 'string') {
        return `${block.data.text}\n`;
      }
      return '';
  }
};

// Helper to convert Editor.js OutputData to Markdown
const editorDataToMarkdown = (data: EditorJsOutputData): string => {
  if (!data || !Array.isArray(data.blocks)) return '';
  return data.blocks.map(blockToPlainTextForMarkdown).join('\n');
};

// Helper to convert Editor.js OutputData to plain text
const editorDataToPlainText = (data: EditorJsOutputData): string => {
    if (!data || !Array.isArray(data.blocks)) return '';
    return data.blocks.map(block => {
      switch (block.type) {
        case 'header': return `${block.data.text || ''}\n\n`;
        case 'paragraph': return `${block.data.text || ''}\n\n`;
        case 'list': return (block.data.items || []).map((item: string) => `- ${item}`).join('\n') + '\n\n';
        case 'quote': return `"${block.data.text || ''}" ${block.data.caption ? `- ${block.data.caption}` : ''}\n\n`;
        case 'code': return `${block.data.code || ''}\n\n`;
        case 'delimiter': return `----------\n\n`;
        case 'image': return `(Image: ${block.data.file?.url || block.data.url || ''} ${block.data.caption ? `- ${block.data.caption}` : ''})\n\n`;
        case 'checklist': return (block.data.items || []).map((item: {text:string, checked:boolean}) => `[${item.checked ? 'x' : ' '}] ${item.text || ''}`).join('\n') + '\n\n';
        case 'table': return (block.data.content || []).map((row: string[]) => (row || []).join('\t')).join('\n') + '\n\n';
        case 'warning': return `Warning: ${block.data.title || ''} - ${block.data.message || ''}\n\n`;
        default: 
            if (block.data && typeof block.data.text === 'string') return `${block.data.text}\n\n`;
            return '';
      }
    }).join('');
};

export const exportNotesAsJSON = (notes: Note[], settings: AppSettings, filename: string = 'mynotes_export.json'): void => {
  const exportData: MyNotesExportData = {
    version: 2, 
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
        let rawNotesArray: Array<Partial<Note> & { content: string | EditorJsOutputData | any }> = []; 

        if (Array.isArray(parsedJson)) { 
          rawNotesArray = parsedJson;
        } else if (parsedJson && typeof parsedJson === 'object') {
          if (parsedJson.version === 2 && Array.isArray(parsedJson.notes) && parsedJson.settings) { 
            rawNotesArray = parsedJson.notes;
            settingsToImport = parsedJson.settings as AppSettings;
          } else if (Array.isArray(parsedJson.notes)) { 
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
          if (!n.id || typeof n.title !== 'string') { 
            console.warn(`Invalid note structure at index ${index}: missing id or title is not a string. Generating ID/Title.`);
            n.id = n.id || `imported-${Date.now()}-${index}`;
            n.title = typeof n.title === 'string' ? n.title : 'Untitled Imported Note';
          }
          
          const processedContent = localSanitizeImportedEditorData(n.content);

          return {
            id: n.id as string, 
            title: n.title as string, 
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
