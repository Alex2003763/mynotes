import React, { useState, useEffect } from 'react';
import OfflineManager from '../services/offlineManager';

interface OfflineStatusProps {
  className?: string;
}

export const OfflineStatus: React.FC<OfflineStatusProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [offlineManager] = useState(() => OfflineManager.getInstance());

  useEffect(() => {
    const handleOfflineEvent = (event: any) => {
      const { type, detail } = event;
      
      switch (type) {
        case 'online':
          setIsOnline(true);
          break;
        case 'offline':
          setIsOnline(false);
          break;
        case 'ready':
          setIsOfflineReady(detail.state.isOfflineReady);
          break;
        case 'update-available':
          setHasUpdate(true);
          setShowUpdate(true);
          break;
        case 'update-applied':
          setHasUpdate(false);
          setShowUpdate(false);
          break;
      }
    };

    // 添加事件監聽器
    offlineManager.addEventListener(handleOfflineEvent);

    // 初始化狀態
    const currentState = offlineManager.getState();
    setIsOnline(currentState.isOnline);
    setIsOfflineReady(currentState.isOfflineReady);

    // 如果還沒初始化，則初始化
    if (!offlineManager.isOnline && !offlineManager.isOfflineReady()) {
      offlineManager.init().catch(console.error);
    }

    return () => {
      offlineManager.removeEventListener(handleOfflineEvent);
    };
  }, [offlineManager]);

  const handleApplyUpdate = async () => {
    try {
      await offlineManager.applyUpdate();
      setShowUpdate(false);
    } catch (error) {
      console.error('Failed to apply update:', error);
    }
  };

  const handleDismissUpdate = () => {
    setShowUpdate(false);
  };

  if (!isOnline || hasUpdate) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 space-y-2 ${className}`}>
        {/* 離線狀態指示器 */}
        {!isOnline && (
          <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm max-w-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <div className="flex-1">
              <div className="font-medium">離線模式</div>
              {isOfflineReady && (
                <div className="text-xs opacity-90">您可以繼續使用應用程式</div>
              )}
              {!isOfflineReady && (
                <div className="text-xs opacity-90">某些功能可能不可用</div>
              )}
            </div>
          </div>
        )}

        {/* 更新通知 */}
        {showUpdate && hasUpdate && (
          <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="font-medium text-sm">新版本可用</div>
                <div className="text-xs opacity-90 mt-1">
                  發現新版本，是否立即更新？
                </div>
              </div>
              <button
                onClick={handleDismissUpdate}
                className="text-white opacity-70 hover:opacity-100 p-1 ml-2"
                aria-label="關閉"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleApplyUpdate}
                className="flex-1 bg-white text-blue-500 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                立即更新
              </button>
              <button
                onClick={handleDismissUpdate}
                className="px-3 py-2 text-white opacity-70 hover:opacity-100 text-sm transition-opacity"
              >
                稍後
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default OfflineStatus;