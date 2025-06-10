
import React from 'react';
import ReactDOM from 'react-dom/client';
import TestApp from './src/TestApp';
import { NotesProvider } from './src/contexts/NoteContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { I18nProvider } from './src/contexts/I18nContext';
import { EditorInteractionProvider } from './src/contexts/EditorInteractionContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SettingsProvider>
          <I18nProvider>
            <NotesProvider>
              <EditorInteractionProvider>
                <TestApp />
              </EditorInteractionProvider>
            </NotesProvider>
          </I18nProvider>
        </SettingsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);