
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App'; // Path assumes App.tsx is in src/
import { NotesProvider } from './src/contexts/NoteContext'; // Path assumes NoteContext.tsx is in src/contexts/
import { SettingsProvider } from './src/contexts/SettingsContext'; // Path assumes SettingsContext.tsx is in src/contexts/
import { I18nProvider } from './src/contexts/I18nContext'; // Path assumes I18nContext.tsx is in src/contexts/
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