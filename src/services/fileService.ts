
import { Note, AppSettings, MyNotesExportData } from '../types';
import { sanitizeMarkdownString } from '../components/NoteEditor'; // For sanitizing imported content

// Helper to convert Markdown to plain text for TXT export
// This is a basic conversion. For more accurate results, a dedicated library might be better.
const markdownToPlainTextForTxtExport = (markdown: string): string => {
  let text = markdown;
  // Remove headings
  text = text.replace(/^#+\s*(.*)/gm, '$1');
  // Remove bold/italic but keep content
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  // Remove strikethrough
  text = text.replace(/~~(.*?)~~/g, '$1');
  // Handle links: display text and URL
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
  // Handle images: display alt text and URL
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, 'Image: $1 ($2)');
  // Convert list items
  text = text.replace(/^[\*\-\+]\s*(.*)/gm, '- $1');
  text = text.replace(/^\d+\.\s*(.*)/gm, '$1.'); // Keep number for ordered
  // Remove blockquotes prefix
  text = text.replace(/^\>\s*(.*)/gm, '$1');
  // Convert horizontal rules to a line
  text = text.replace(/^(---\s*|\*\*\*\s*)/gm, '------------------------------');
  // Attempt to format code blocks
  text = text.replace(/```(\w*)\n([\s\S]*?)\n```/g, '\n--- Code ($1) ---\n$2\n--- End Code ---\n');
  text = text.replace(/`([^`]+)`/g, '$1'); // inline code
  // Remove HTML tags just in case
  text = text.replace(/<[^>]+>/g, '');
  return text;
};

export const exportNotesAsJSON = (notes: Note[], settings: AppSettings): void => {
  const date = new Date().toISOString().split('T')[0];
  const filename = `mynotes_export_${date}.json`;
  const exportData: MyNotesExportData = {
    version: 2, // Keep version, format now implies Markdown content
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
  // Note.content is already Markdown. Prepend title and tags.
  const titleHeader = `# ${note.title}\n\n`;
  const tagsHeader = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}\n\n` : '';
  const pagesContent = note.pages.map(page => `## ${page.title}\n\n${page.content}`).join('\n\n---\n\n');
  const markdownContent = titleHeader + tagsHeader + pagesContent;
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
  const pagesContent = note.pages.map(page => `--- ${page.title} ---\n\n${markdownToPlainTextForTxtExport(page.content)}`).join('\n\n------------------------------\n\n');
  const txtContent = titleHeader + tagsHeader + pagesContent;
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
        // Expect rawNotesArray to have 'content' as string (Markdown)
        let rawNotesArray: Array<Partial<Note> & { content: string | any }> = []; 

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
          
          // Sanitize content to ensure it's a string.
          // If n.content is old EditorJS format, sanitizeMarkdownString will try to convert it.
          const pages = Array.isArray(n.pages) ? n.pages.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            title: p.title || 'Page',
            content: sanitizeMarkdownString(p.content),
          })) : [{ id: crypto.randomUUID(), title: 'Page 1', content: sanitizeMarkdownString(n.content) }];

          const note: Note = {
            id: n.id as string,
            title: n.title as string,
            content: { blocks: [] } as any, // Placeholder
            pages: pages,
            tags: Array.isArray(n.tags) ? n.tags.filter(t => typeof t === 'string') : [],
            createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
            updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
          };
          return note;
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
