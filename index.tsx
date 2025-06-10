
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { NotesProvider } from './src/contexts/NoteContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { I18nProvider } from './src/contexts/I18nContext';
import { EditorInteractionProvider } from './src/contexts/EditorInteractionContext'; // Added import
import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <I18nProvider>
          <NotesProvider>
            <EditorInteractionProvider> {/* Added Provider wrapper */}
              <App />
            </EditorInteractionProvider>
          </NotesProvider>
        </I18nProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
