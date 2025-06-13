import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { SettingsModal } from './components/SettingsModal';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { useSettings } from './contexts/SettingsContext';
import { useNotes } from './contexts/NoteContext';
import { Resizer } from './components/Resizer';
import OfflineStatus from './components/OfflineStatus';
import OfflineManager from './services/offlineManager';

const MIN_SIDEBAR_WIDTH = 200; // px
const MAX_SIDEBAR_WIDTH = 500; // px
const DEFAULT_LEFT_SIDEBAR_WIDTH = 300; // px
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 320; // w-80

const App: React.FC = () => {
  const { settings } = useSettings();
  const { notes, selectNote, selectedNoteId, loading } = useNotes();
  // Sidebar states
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(window.innerWidth > 768);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(window.innerWidth > 1200);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Sidebar widths
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
  // 初始化新的離線管理器
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('App: Initializing offline manager...');
        
        const offlineManager = OfflineManager.getInstance();
        await offlineManager.init();
        
        console.log('App: Offline manager initialization completed');
      } catch (error) {
        console.error('App: Offline manager initialization failed:', error);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (loading) return;

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
  }, [loading, location.pathname, selectedNoteId, notes, selectNote, navigate, location.state]);
  
  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  const handleLeftResize = useCallback((deltaX: number) => {
    setLeftSidebarWidth(prevWidth => {
      // DeltaX is from left edge of resizer. If dragging right, deltaX is positive.
      // For left sidebar, dragging resizer right *increases* its width.
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
      // Auto-close left sidebar on smaller screens
      if (window.innerWidth <= 768) {
        setIsLeftSidebarOpen(false);
      }
      // Right sidebar visibility for larger screens
      setIsRightSidebarVisible(window.innerWidth > 1200);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen selection:bg-primary/30 selection:text-primary-dark dark:selection:text-primary-light">
      <PerformanceMonitor />
      <Header
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
      />
      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile overlay */}
        {isLeftSidebarOpen && window.innerWidth <= 768 && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsLeftSidebarOpen(false)}
          />
        )}
        {/* Left sidebar with search and sort */}
        <Sidebar
          isOpen={isLeftSidebarOpen}
          onClose={() => setIsLeftSidebarOpen(false)}
          width={leftSidebarWidth}
          onOpenSettings={openSettingsModal}
        />
        
        {/* Left sidebar resizer - only shown on desktop when sidebar is visible */}
        {isLeftSidebarOpen && (
          <Resizer onResize={handleLeftResize} />
        )}
        
        <MainContent />
        
        {/* Right sidebar and its resizer, only shown on relevant routes and larger screens */}
        {showRightSidebarPanel && isRightSidebarVisible && (
          <>
            <div className="hidden xl:block">
              <Resizer onResize={handleRightResize} />
            </div>
            <div className="hidden xl:block h-full">
              <RightSidebar
                width={rightSidebarWidth}
              />
            </div>
          </>
        )}
      </div>
      {isSettingsModalOpen && <SettingsModal onClose={closeSettingsModal} />}
      <OfflineStatus />
    </div>
  );
};

export default App;