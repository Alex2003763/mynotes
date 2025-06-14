import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import OfflineCacheService from '../services/offlineCacheService';

interface CacheStatus {
  isOffline: boolean;
  lastSync: number;
  cacheSize: number;
  availableData: string[];
}

export const OfflineStatusIndicator: React.FC = () => {
  const { t } = useI18n();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      setIsOffline(!navigator.onLine);
      try {
        const status = await OfflineCacheService.getCacheStatus();
        setCacheStatus(status);
      } catch (error) {
        console.warn('Failed to get cache status:', error);
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      updateStatus();
    };

    const handleOffline = () => {
      setIsOffline(true);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('cache-back-online', handleOnline);
    window.addEventListener('cache-offline-mode', handleOffline);

    // 初始狀態檢查
    updateStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('cache-back-online', handleOnline);
      window.removeEventListener('cache-offline-mode', handleOffline);
    };
  }, []);

  const formatCacheSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLastSync = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    return 'Just now';
  };

  if (!isOffline && !showDetails) {
    return null; // 在線時不顯示
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${isOffline ? 'block' : 'hidden'}`}>
      <div className={`
        p-3 rounded-lg shadow-lg border
        ${isOffline 
          ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200' 
          : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
        }
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-sm font-medium">
              {isOffline ? '離線模式' : '已連線'}
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
            {showDetails ? '隱藏' : '詳情'}
          </button>
        </div>

        {isOffline && (
          <p className="text-xs mt-1 opacity-80">
            使用快取資料
          </p>
        )}

        {showDetails && cacheStatus && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>快取大小：</span>
                <span>{formatCacheSize(cacheStatus.cacheSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>最後同步：</span>
                <span>{formatLastSync(cacheStatus.lastSync)}</span>
              </div>
              <div className="flex justify-between">
                <span>可用資料：</span>
                <span>{cacheStatus.availableData.length} 項</span>
              </div>
              
              {cacheStatus.availableData.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs opacity-70 mb-1">快取內容：</div>
                  <div className="flex flex-wrap gap-1">
                    {cacheStatus.availableData.map((item, index) => (
                      <span
                        key={index}
                        className="px-1 py-0.5 rounded text-xs bg-current/10"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};