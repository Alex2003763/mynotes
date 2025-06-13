import React, { useState, useEffect } from 'react';
import { pwaService } from '../services/pwaService';
import { syncService } from '../services/syncService';

export const PWAStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 檢查待同步數量
    const updatePendingCount = () => {
      setPendingCount(syncService.getPendingOperationsCount());
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    // 監聽安裝提示
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // 如果不是 PWA 模式且沒有顯示過安裝提示，則顯示
      if (!pwaService.isPWA() && !localStorage.getItem('pwa-install-dismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('用戶接受了安裝');
      } else {
        console.log('用戶拒絕了安裝');
      }
      
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleSync = () => {
    syncService.forcSync();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* 離線狀態指示器 */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <span>離線模式</span>
        </div>
      )}

      {/* 同步狀態 */}
      {pendingCount > 0 && (
        <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"></path>
          </svg>
          <span>{pendingCount} 項待同步</span>
          {isOnline && (
            <button
              onClick={handleSync}
              className="ml-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded text-xs"
            >
              同步
            </button>
          )}
        </div>
      )}

      {/* 安裝提示橫幅 */}
      {showInstallBanner && deferredPrompt && (
        <div className="bg-primary text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-semibold">安裝 MyNotes</div>
              <div className="text-sm opacity-90">添加到主屏幕以獲得更好的體驗</div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white opacity-70 hover:opacity-100 p-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-white text-primary px-3 py-2 rounded font-semibold text-sm hover:bg-gray-100"
            >
              安裝
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-white opacity-70 hover:opacity-100 text-sm"
            >
              稍後
            </button>
          </div>
        </div>
      )}
    </div>
  );
};