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
import { OfflineStatusIndicator } from './components/OfflineStatusIndicator';
import { ProductionDebugPanel } from './components/ProductionDebugPanel';
import OfflineCacheService from './services/offlineCacheService';
import TranslationCacheService from './services/translationCacheService';

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

  // 初始化離線快取系統
  useEffect(() => {
    const initializeOfflineSupport = async () => {
      try {
        // 初始化離線快取服務
        await OfflineCacheService.initialize();
        
        // 預載入翻譯檔案
        await TranslationCacheService.preloadTranslations();
        
        console.log('App: Offline support initialized successfully');
      } catch (error) {
        console.warn('App: Failed to initialize offline support:', error);
      }
    };

    initializeOfflineSupport();
    
    // 將快取服務導出到全域，方便測試和除錯
    if (typeof window !== 'undefined') {
      (window as any).OfflineCacheService = OfflineCacheService;
      (window as any).TranslationCacheService = TranslationCacheService;
    }
  }, []);

  // 監聽快取狀態變化
  useEffect(() => {
    const handleCacheStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('App: Cache status changed:', customEvent.type);
      
      // 可以在這裡添加 UI 提示，告知用戶離線狀態
      if (customEvent.type === 'cache-offline-mode') {
        // 顯示離線模式提示
      } else if (customEvent.type === 'cache-back-online') {
        // 顯示重新連線提示
      }
    };

    window.addEventListener('cache-offline-mode', handleCacheStatusChange);
    window.addEventListener('cache-back-online', handleCacheStatusChange);

    return () => {
      window.removeEventListener('cache-offline-mode', handleCacheStatusChange);
      window.removeEventListener('cache-back-online', handleCacheStatusChange);
    };
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
      <OfflineStatusIndicator />
      <ProductionDebugPanel />
    </div>
  );
};

export default App;