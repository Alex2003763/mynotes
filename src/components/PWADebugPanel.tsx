import React, { useState, useEffect } from 'react';
import { 
  isPWASupported, 
  isPWAInstalled, 
  getServiceWorkerStatus,
  getCacheInfo,
  getNetworkStatus,
  formatFileSize,
  clearAllCaches
} from '../utils/pwaUtils';

interface PWADebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PWADebugPanel: React.FC<PWADebugPanelProps> = ({ isOpen, onClose }) => {
  const [swStatus, setSWStatus] = useState<any>(null);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDebugInfo();
    }
  }, [isOpen]);

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      const [sw, cache, network] = await Promise.all([
        getServiceWorkerStatus(),
        getCacheInfo().catch(() => ({ cacheNames: [], totalSize: 0, cacheDetails: {} })),
        Promise.resolve(getNetworkStatus())
      ]);
      
      setSWStatus(sw);
      setCacheInfo(cache);
      setNetworkStatus(network);
    } catch (error) {
      console.error('Error loading debug info:', error);
    }
    setLoading(false);
  };

  const handleClearCaches = async () => {
    if (window.confirm('確定要清除所有快取嗎？這可能會影響離線功能。')) {
      try {
        await clearAllCaches();
        await loadDebugInfo();
        alert('快取已清除');
      } catch (error) {
        alert('清除快取失敗: ' + error);
      }
    }
  };

  const handleForceUpdate = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          alert('已檢查更新');
          await loadDebugInfo();
        }
      } catch (error) {
        alert('檢查更新失敗: ' + error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              PWA 除錯面板
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">載入中...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* PWA 支援狀態 */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                  PWA 支援狀態
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="text-sm text-gray-600 dark:text-gray-400">PWA 支援</p>
                    <p className={`font-medium ${isPWASupported() ? 'text-green-600' : 'text-red-600'}`}>
                      {isPWASupported() ? '✓ 支援' : '✗ 不支援'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="text-sm text-gray-600 dark:text-gray-400">已安裝</p>
                    <p className={`font-medium ${isPWAInstalled() ? 'text-green-600' : 'text-orange-600'}`}>
                      {isPWAInstalled() ? '✓ 已安裝' : '○ 未安裝'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Worker 狀態 */}
              {swStatus && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    Service Worker 狀態
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">已註冊</p>
                      <p className={`font-medium ${swStatus.registered ? 'text-green-600' : 'text-red-600'}`}>
                        {swStatus.registered ? '✓' : '✗'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">運行中</p>
                      <p className={`font-medium ${swStatus.active ? 'text-green-600' : 'text-red-600'}`}>
                        {swStatus.active ? '✓' : '✗'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">等待中</p>
                      <p className={`font-medium ${swStatus.waiting ? 'text-orange-600' : 'text-gray-600'}`}>
                        {swStatus.waiting ? '○' : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 快取資訊 */}
              {cacheInfo && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    快取資訊
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">總快取大小</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatFileSize(cacheInfo.totalSize)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">快取詳情</p>
                      {cacheInfo.cacheNames.length > 0 ? (
                        <div className="space-y-1">
                          {cacheInfo.cacheNames.map((name: string) => (
                            <div key={name} className="flex justify-between text-xs">
                              <span className="truncate">{name}</span>
                              <span>{formatFileSize(cacheInfo.cacheDetails[name] || 0)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">無快取</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 網路狀態 */}
              {networkStatus && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    網路狀態
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">連線狀態</p>
                      <p className={`font-medium ${networkStatus.online ? 'text-green-600' : 'text-red-600'}`}>
                        {networkStatus.online ? '✓ 線上' : '✗ 離線'}
                      </p>
                    </div>
                    {networkStatus.effectiveType && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400">連線類型</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {networkStatus.effectiveType}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={loadDebugInfo}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  重新整理
                </button>
                <button
                  onClick={handleForceUpdate}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  檢查更新
                </button>
                <button
                  onClick={handleClearCaches}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  清除快取
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWADebugPanel;