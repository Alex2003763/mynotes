import React, { useState, useEffect } from 'react';
import OfflineCacheService from '../services/offlineCacheService';

interface DebugInfo {
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasCacheAPI: boolean;
  hasIndexedDB: boolean;
  currentOrigin: string;
  userAgent: string;
  swRegistration: any;
  cacheStatus: any;
}

export const ProductionDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        const swRegistration = 'serviceWorker' in navigator 
          ? await navigator.serviceWorker.getRegistration()
          : null;

        const cacheStatus = await OfflineCacheService.getCacheStatus();

        setDebugInfo({
          isSecureContext: window.isSecureContext,
          hasServiceWorker: 'serviceWorker' in navigator,
          hasCacheAPI: 'caches' in window,
          hasIndexedDB: 'indexedDB' in window,
          currentOrigin: window.location.origin,
          userAgent: navigator.userAgent,
          swRegistration: swRegistration ? {
            scope: swRegistration.scope,
            state: swRegistration.active?.state,
            updateViaCache: swRegistration.updateViaCache
          } : null,
          cacheStatus
        });
      } catch (error) {
        console.error('Failed to load debug info:', error);
      }
    };

    loadDebugInfo();
  }, []);

  const runCacheTest = async () => {
    const results: string[] = [];
    
    try {
      results.push('🧪 開始快取功能測試...');
      
      // 測試 Cache API
      if ('caches' in window) {
        try {
          const cache = await caches.open('test-cache');
          await cache.put('/test', new Response('test'));
          const response = await cache.match('/test');
          if (response) {
            results.push('✅ Cache API 工作正常');
          } else {
            results.push('❌ Cache API 存儲失敗');
          }
          await caches.delete('test-cache');
        } catch (error) {
          results.push(`❌ Cache API 錯誤: ${error}`);
        }
      } else {
        results.push('❌ Cache API 不支援');
      }

      // 測試 IndexedDB
      if ('indexedDB' in window) {
        try {
          const request = indexedDB.open('test-db', 1);
          await new Promise((resolve, reject) => {
            request.onsuccess = () => {
              request.result.close();
              resolve(true);
            };
            request.onerror = () => reject(request.error);
          });
          results.push('✅ IndexedDB 工作正常');
          indexedDB.deleteDatabase('test-db');
        } catch (error) {
          results.push(`❌ IndexedDB 錯誤: ${error}`);
        }
      } else {
        results.push('❌ IndexedDB 不支援');
      }

      // 測試 localStorage
      try {
        localStorage.setItem('test', 'value');
        const value = localStorage.getItem('test');
        if (value === 'value') {
          results.push('✅ localStorage 工作正常');
        } else {
          results.push('❌ localStorage 讀取失敗');
        }
        localStorage.removeItem('test');
      } catch (error) {
        results.push(`❌ localStorage 錯誤: ${error}`);
      }

      // 測試網路請求
      try {
        const response = await fetch('/locales/en.json');
        if (response.ok) {
          results.push('✅ 網路請求正常');
        } else {
          results.push(`❌ 網路請求失敗: ${response.status}`);
        }
      } catch (error) {
        results.push(`❌ 網路請求錯誤: ${error}`);
      }

      results.push('🎯 測試完成');
      
    } catch (error) {
      results.push(`❌ 測試過程錯誤: ${error}`);
    }
    
    setTestResults(results);
  };

  const clearAllCaches = async () => {
    try {
      await OfflineCacheService.clearAllCaches();
      setTestResults(['✅ 所有快取已清除']);
    } catch (error) {
      setTestResults([`❌ 清除快取失敗: ${error}`]);
    }
  };

  // 只在開發模式或特定條件下顯示
  const shouldShow = import.meta.env.DEV || 
                    window.location.search.includes('debug=true') ||
                    window.location.hostname !== 'localhost';

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm shadow-lg hover:bg-blue-700 transition-colors"
      >
        🔧 除錯
      </button>
      
      {isVisible && (
        <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-md max-h-96 overflow-y-auto text-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">生產環境除錯</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {debugInfo && (
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>安全上下文:</div>
                <div className={debugInfo.isSecureContext ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.isSecureContext ? '✅' : '❌'}
                </div>
                
                <div>Service Worker:</div>
                <div className={debugInfo.hasServiceWorker ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.hasServiceWorker ? '✅' : '❌'}
                </div>
                
                <div>Cache API:</div>
                <div className={debugInfo.hasCacheAPI ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.hasCacheAPI ? '✅' : '❌'}
                </div>
                
                <div>IndexedDB:</div>
                <div className={debugInfo.hasIndexedDB ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.hasIndexedDB ? '✅' : '❌'}
                </div>
              </div>

              <div className="border-t pt-2 mt-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <div>來源: {debugInfo.currentOrigin}</div>
                  {debugInfo.swRegistration && (
                    <div>SW 範圍: {debugInfo.swRegistration.scope}</div>
                  )}
                </div>
              </div>

              {debugInfo.cacheStatus && (
                <div className="border-t pt-2 mt-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div>快取大小: {Math.round(debugInfo.cacheStatus.cacheSize / 1024)} KB</div>
                    <div>離線狀態: {debugInfo.cacheStatus.isOffline ? '是' : '否'}</div>
                    <div>可用數據: {debugInfo.cacheStatus.availableData.length} 項</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={runCacheTest}
              className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
            >
              執行快取測試
            </button>
            
            <button
              onClick={clearAllCaches}
              className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
            >
              清除所有快取
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-gray-700 dark:text-gray-300">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};