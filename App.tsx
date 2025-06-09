
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { NoteEditor } from './components/NoteEditor';
// import { NoteList } from './components/NoteList'; // NoteList is inside Sidebar
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { useSettings } from './contexts/SettingsContext';
import { useNotes } from './contexts/NoteContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useI18n } from './contexts/I18nContext'; // For future use if needed here

const App: React.FC = () => {
  const { settings } = useSettings();
  const { notes, selectNote, selectedNoteId, loading: notesLoading } = useNotes();
  const { t } = useI18n(); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768); // Default open on desktop
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // SettingsContext now handles theme and lang attribute on html tag
  }, [settings.theme, settings.language]);

  useEffect(() => {
    if (notesLoading) return;

    const pathIsNew = location.pathname === '/new';
    const pathIsRoot = location.pathname === '/';
    const pathNoteId = location.pathname.startsWith('/note/') ? location.pathname.split('/note/')[1] : null;

    if (pathIsNew) {
      // When navigating to create a new note, ensure no note is marked as selected globally
      if (selectedNoteId !== null) selectNote(null);
    } else if (pathIsRoot) {
      // When navigating to the root, ensure no note is marked as selected globally
      // This allows the WelcomeScreen to show.
      if (selectedNoteId !== null) selectNote(null);
      // If there are no notes, WelcomeScreen with create button will be shown by Route.
      // If there are notes, WelcomeScreen with "select or create" will be shown.
    } else if (pathNoteId) {
      // We are on a /note/:id path
      if (selectedNoteId !== pathNoteId) {
        // If the globally selected note is different from the path, or no note is selected yet
        const noteExists = notes.some(n => n.id === pathNoteId);
        if (noteExists) {
          selectNote(pathNoteId); // Sync global selection with the path
        } else {
          // Note ID in path does not exist (e.g., deleted, or bad link)
          selectNote(null); // Deselect any potentially lingering selection
          navigate('/', { replace: true }); // Navigate to the root/welcome screen
        }
      }
      // If selectedNoteId === pathNoteId, everything is consistent.
    } else {
      // Path is not /new, /, or /note/:id (e.g., unrecognized path, or selectedNoteId exists but path is different)
      if (selectedNoteId) {
        // A note is globally selected, so user should be on its page
        navigate(`/note/${selectedNoteId}`, { replace: true });
      } else {
        // No note selected, and path is unrecognized. Default to root.
         if (!pathIsRoot) navigate('/', { replace: true });
      }
    }
  }, [notesLoading, location.pathname, selectedNoteId, notes, selectNote, navigate]);
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  return (
    <div className="flex flex-col h-screen selection:bg-primary/30 selection:text-primary-dark dark:selection:text-primary-light">
      <Header 
        onToggleSidebar={toggleSidebar} 
        onOpenSettings={openSettingsModal} 
        isSidebarOpen={isSidebarOpen} 
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto bg-white dark:bg-slate-800 shadow-inner">
          <Routes>
            <Route path="/" element={
              notesLoading ? <p className="text-center py-10">{t('noteList.loading')}</p> : 
              (notes && notes.length > 0) ? <WelcomeScreen message={t('welcomeScreen.selectOrCreate')} /> :
              <WelcomeScreen showCreateButton={true} />
            } />
            <Route path="/note/:noteId" element={<NoteEditor />} />
            <Route path="/new" element={<NoteEditor isNewNote={true} />} />
          </Routes>
        </main>
      </div>
      {isSettingsModalOpen && <SettingsModal onClose={closeSettingsModal} />}
    </div>
  );
};

export default App;
