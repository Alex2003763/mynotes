import React, { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface PWAManagerProps {
  children: React.ReactNode;
}

export const PWAManager: React.FC<PWAManagerProps> = ({ children }) => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSWFunction = registerSW({
      onNeedRefresh() {
        console.log('PWA: 發現新版本，需要刷新');
        setNeedRefresh(true);
      },
      onOfflineReady() {
        console.log('PWA: 應用程式已準備好離線使用');
        setOfflineReady(true);
      },
      onRegistered(registration) {
        console.log('PWA: Service Worker 已註冊', registration);
      },
      onRegisterError(error) {
        console.error('PWA: Service Worker 註冊失敗', error);
      },
    });

    setUpdateSW(() => updateSWFunction);

    // 檢查網路狀態
    const handleOnline = () => {
      console.log('PWA: 網路連線已恢復');
    };

    const handleOffline = () => {
      console.log('PWA: 網路連線已中斷，切換到離線模式');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const closeUpdatePrompt = () => {
    setNeedRefresh(false);
  };

  const handleUpdate = async () => {
    if (updateSW) {
      await updateSW();
      setNeedRefresh(false);
    }
  };

  const closeOfflinePrompt = () => {
    setOfflineReady(false);
  };

  return (
    <>
      {children}
      
      {/* 更新提示 */}
      {needRefresh && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start space-x-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">新版本可用</h4>
              <p className="text-xs opacity-90 mt-1">發現新版本，點擊更新以獲得最新功能。</p>
            </div>
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              更新
            </button>
            <button
              onClick={closeUpdatePrompt}
              className="bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-800 transition-colors"
            >
              稍後
            </button>
          </div>
        </div>
      )}

      {/* 離線就緒提示 */}
      {offlineReady && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start space-x-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">離線就緒</h4>
              <p className="text-xs opacity-90 mt-1">應用程式已準備好離線使用！</p>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={closeOfflinePrompt}
              className="bg-green-700 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-800 transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* 離線狀態指示器 */}
      {!navigator.onLine && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium z-50">
          <span className="inline-flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            離線模式 - 某些功能可能受限
          </span>
        </div>
      )}
    </>
  );
};