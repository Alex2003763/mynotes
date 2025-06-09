
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { NoteEditor } from './components/NoteEditor';
import { ViewNote } from './components/ViewNote'; // Import ViewNote
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
    const pathViewId = location.pathname.startsWith('/view/') ? location.pathname.split('/view/')[1] : null;
    const currentIdInPath = pathNoteId || pathViewId;

    if (pathIsNew) {
      if (selectedNoteId !== null && (!location.state || !location.state.initialContentText)) { // Don't clear if navigating with state for new note
        selectNote(null); 
      }
    } else if (pathIsRoot) {
      if (selectedNoteId !== null) {
        selectNote(null); 
      }
    } else if (currentIdInPath) {
      if (selectedNoteId !== currentIdInPath) {
        const noteExists = notes.some(n => n.id === currentIdInPath);
        if (noteExists) {
          selectNote(currentIdInPath); 
        } else {
          selectNote(null); 
          navigate('/', { replace: true }); 
        }
      }
    } else {
      // Path is not /new, not /, and not /note/:id or /view/:id
      if (selectedNoteId) {
        // A note IS selected in context, but URL doesn't match its view/edit page.
        // Default to its view page.
        navigate(`/view/${selectedNoteId}`, { replace: true });
      } else {
        // No note selected, and not on a recognized general path. Go to root.
        navigate('/', { replace: true });
      }
    }
  }, [notesLoading, location.pathname, selectedNoteId, notes, selectNote, navigate, location.state]);
  
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
        <main className="flex-1 px-1 sm:px-2 md:px-3 lg:px-4 py-3 sm:py-4 md:py-5 lg:py-6 overflow-y-auto bg-white dark:bg-slate-800 shadow-inner">
          <Routes>
            <Route path="/" element={
              notesLoading ? <p className="text-center py-10">{t('noteList.loading')}</p> : 
              (notes && notes.length > 0) ? <WelcomeScreen message={t('welcomeScreen.selectOrCreate')} /> :
              <WelcomeScreen showCreateButton={true} />
            } />
            <Route path="/note/:noteId" element={<NoteEditor />} />
            <Route path="/new" element={<NoteEditor isNewNote={true} />} />
            <Route path="/view/:noteId" element={<ViewNote />} /> {/* Added ViewNote route */}
          </Routes>
        </main>
      </div>
      {isSettingsModalOpen && <SettingsModal onClose={closeSettingsModal} />}
    </div>
  );
};

export default App;
