
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NotesProvider } from './contexts/NoteContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { I18nProvider } from './contexts/I18nContext';
import { HashRouter } from 'react-router-dom';

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
            <App />
          </NotesProvider>
        </I18nProvider>
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>
);