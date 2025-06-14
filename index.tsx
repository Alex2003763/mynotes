import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { NotesProvider } from './src/contexts/NoteContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { I18nProvider } from './src/contexts/I18nContext';
import { EditorInteractionProvider } from './src/contexts/EditorInteractionContext';
import { HashRouter } from 'react-router-dom';
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');
  wb.register();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <SettingsProvider>
        <I18nProvider>
          <NotesProvider>
            <EditorInteractionProvider>
              <App />
            </EditorInteractionProvider>
          </NotesProvider>
        </I18nProvider>
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>
);