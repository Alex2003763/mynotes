import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface UpdatePromptProps {
  className?: string;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({ className = '' }) => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      console.log('[PWA] New content available, update needed.');
      setNeedRefresh(true);
    },
    onOfflineReady() {
      console.log('[PWA] App is ready to work offline.');
      setOfflineReady(true);
    },
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered.', registration);
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

  // 監聽網絡狀態
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdate = async () => {
    try {
      await updateServiceWorker(true); // Pass true to reload the page after update
      setNeedRefresh(false);
    } catch (error) {
      console.error('[PWA] Update failed:', error);
    }
  };

  const handleDismissUpdate = () => {
    setNeedRefresh(false);
  };

  const handleDismissOffline = () => {
    setOfflineReady(false);
  };

  return (
    <> 
      {/* 離線狀態指示器 */}
      {!isOnline && (
        <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm animate-fadeIn ${className}`}>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>離線模式 - 某些功能可能不可用</span>
          </div>
        </div>
      )}
      {/* 應用更新提示 */}
      {needRefresh && (
        <div className={`fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm animate-fadeIn ${className}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">應用程式更新</h4>
              <p className="text-xs opacity-90 mt-1">
                新版本已下載完成，點擊立即更新以獲得最新功能和修復。
              </p>
            </div>
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors flex items-center space-x-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>立即更新</span>
            </button>
            <button
              onClick={handleDismissUpdate}
              className="bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-800 transition-colors"
            >
              稍後提醒
            </button>
          </div>
        </div>
      )}

      {/* 離線就緒提示 */}
      {offlineReady && (
        <div className={`fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm animate-fadeIn ${className}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">離線就緒</h4>
              <p className="text-xs opacity-90 mt-1">
                應用程式現在可以離線使用了！您可以在沒有網路連接時繼續使用所有功能。
              </p>
            </div>
            <button
              onClick={handleDismissOffline}
              className="text-2xl leading-none -mt-1 -mr-1 opacity-80 hover:opacity-100 transition-opacity"
              aria-label="關閉通知"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
};
