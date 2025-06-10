import React, { createContext, useState, useCallback, ReactNode, useContext } from 'react';

interface EditorInteractionGetters {
  id: string; 
  getTitle: () => string; 
  getFullContentAsText: () => Promise<string>; 
  applyAiChangesToEditor: (newMarkdown: string) => void; 
  setTagsFromAI: (newTags: string[]) => void; 
}

interface EditorInteractionContextType {
  activeEditor: EditorInteractionGetters | null;
  setActiveEditorInteraction: (getters: EditorInteractionGetters | null) => void;
}

export const EditorInteractionContext = createContext<EditorInteractionContextType | undefined>(undefined);

export const EditorInteractionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeEditor, setActiveEditorState] = useState<EditorInteractionGetters | null>(null);

  const setActiveEditorInteraction = useCallback((getters: EditorInteractionGetters | null) => {
    setActiveEditorState(getters);
  }, []);

  return (
    <EditorInteractionContext.Provider value={{ activeEditor, setActiveEditorInteraction }}>
      {children}
    </EditorInteractionContext.Provider>
  );
};

export const useEditorInteraction = (): EditorInteractionContextType => {
  const context = useContext(EditorInteractionContext);
  if (!context) {
    throw new Error('useEditorInteraction must be used within an EditorInteractionProvider');
  }
  return context;
};