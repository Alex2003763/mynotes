import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { NoteEditor } from './components/NoteEditor';
import { ViewNote } from './components/ViewNote';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { SettingsModal } from './components/SettingsModal';
import { useSettings } from './contexts/SettingsContext';
import { useNotes } from './contexts/NoteContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useI18n } from './contexts/I18nContext';
import { Resizer } from './components/Resizer'; // Import Resizer

const MIN_SIDEBAR_WIDTH = 200; // px
const MAX_SIDEBAR_WIDTH = 500; // px
const DEFAULT_LEFT_SIDEBAR_WIDTH = 288; // w-72
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 320; // w-80

const App: React.FC = () => {
  const { settings, isLoadingSettings } = useSettings();
  const { notes, selectNote, selectedNoteId, loading: notesLoading } = useNotes();
  const { t } = useI18n();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(
    parseInt(localStorage.getItem('leftSidebarWidth') || DEFAULT_LEFT_SIDEBAR_WIDTH.toString())
  );
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(
    parseInt(localStorage.getItem('rightSidebarWidth') || DEFAULT_RIGHT_SIDEBAR_WIDTH.toString())
  );

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('leftSidebarWidth', leftSidebarWidth.toString());
  }, [leftSidebarWidth]);

  useEffect(() => {
    localStorage.setItem('rightSidebarWidth', rightSidebarWidth.toString());
  }, [rightSidebarWidth]);

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
      if (selectedNoteId !== null && (!location.state || !location.state.initialContentText)) {
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
      // This case handles undefined paths. If a note is selected, redirect to its view. Otherwise, to root.
      // This helps avoid blank states on unknown URLs if a note was previously selected.
      if (selectedNoteId) {
         // Check if current path is already for the selected note to prevent loops
        if (!location.pathname.startsWith(`/view/${selectedNoteId}`) && !location.pathname.startsWith(`/note/${selectedNoteId}`)) {
            navigate(`/view/${selectedNoteId}`, { replace: true });
        }
      } else if (location.pathname !== '/') { // Avoid redirecting if already at root and no note selected
        navigate('/', { replace: true });
      }
    }
  }, [notesLoading, location.pathname, selectedNoteId, notes, selectNote, navigate, location.state]);
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  // const toggleRightSidebar = () => setIsRightSidebarVisible(!isRightSidebarVisible); 
  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  const handleLeftResize = useCallback((deltaX: number) => {
    setLeftSidebarWidth(prevWidth => {
      const newWidth = prevWidth + deltaX;
      return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
    });
  }, []);

  const handleRightResize = useCallback((deltaX: number) => {
    setRightSidebarWidth(prevWidth => {
      // DeltaX is from left edge of resizer. If dragging left, deltaX is negative.
      // For right sidebar, dragging resizer left *decreases* its width.
      const newWidth = prevWidth - deltaX; 
      return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
    });
  }, []);

  // Determine if right sidebar should be shown based on route
  const showRightSidebarPanel = location.pathname.startsWith('/note/') || location.pathname.startsWith('/new') || location.pathname.startsWith('/view/');

  // For responsive handling of sidebar visibility
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobileView = width < 768;
      console.log('Window width:', width, 'isMobile:', isMobileView);
      setIsMobile(isMobileView);
      
      // Always show sidebars on desktop, let mobile handle it differently
      if (!isMobileView) {
        setIsSidebarOpen(true);
        setIsRightSidebarVisible(width > 1024);
      } else {
        setIsSidebarOpen(false);
        setIsRightSidebarVisible(false);
      }
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Show loading screen while settings are being loaded
  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen selection:bg-primary/30 selection:text-primary-dark dark:selection:text-primary-light">
      <Header
        onToggleSidebar={toggleSidebar}
        onOpenSettings={openSettingsModal}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Always show sidebar on desktop, conditionally on mobile */}
        <div className={`${isMobile && !isSidebarOpen ? 'hidden' : 'block'}`}>
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            width={leftSidebarWidth}
          />
        </div>
        
        {/* Resizer for left sidebar, only shown on desktop */}
        {!isMobile && (
          <div className="w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-gray-300 dark:hover:bg-gray-600"
               onMouseDown={(e) => {
                 const startX = e.clientX;
                 const startWidth = leftSidebarWidth;
                 
                 const handleMouseMove = (e: MouseEvent) => {
                   const deltaX = e.clientX - startX;
                   handleLeftResize(deltaX);
                 };
                 
                 const handleMouseUp = () => {
                   document.removeEventListener('mousemove', handleMouseMove);
                   document.removeEventListener('mouseup', handleMouseUp);
                 };
                 
                 document.addEventListener('mousemove', handleMouseMove);
                 document.addEventListener('mouseup', handleMouseUp);
               }}
          />
        )}
        
        <main className="flex-1 flex flex-col px-1 sm:px-2 md:px-3 lg:px-4 py-3 sm:py-4 md:py-5 lg:py-6 overflow-auto bg-white dark:bg-slate-800 shadow-inner">
          <Routes>
            <Route path="/" element={
              notesLoading ? <p className="text-center py-10">{t('noteList.loading')}</p> : 
              (notes && notes.length > 0) ? <WelcomeScreen message={t('welcomeScreen.selectOrCreate')} /> :
              <WelcomeScreen showCreateButton={true} />
            } />
            <Route path="/note/:noteId" element={<NoteEditor />} />
            <Route path="/new" element={<NoteEditor isNewNote={true} />} />
            <Route path="/view/:noteId" element={<ViewNote />} />
            <Route path="*" element={ // Fallback for unknown routes
                 notesLoading ? <p className="text-center py-10">{t('noteList.loading')}</p> : 
                 (notes && notes.length > 0) ? <WelcomeScreen message={t('welcomeScreen.selectOrCreate')} /> :
                 <WelcomeScreen showCreateButton={true} />
            } />
          </Routes>
        </main>
        
        {/* Right sidebar and its resizer, only shown on relevant routes and desktop */}
        {showRightSidebarPanel && isRightSidebarVisible && <Resizer onResize={handleRightResize} />}
        {showRightSidebarPanel && isRightSidebarVisible && (
          <RightSidebar 
            width={rightSidebarWidth} 
          />
        )}
      </div>
      {isSettingsModalOpen && <SettingsModal onClose={closeSettingsModal} />}
    </div>
  );
};

export default App;