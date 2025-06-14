import React, { useState, useEffect } from 'react';

export const PWATestPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runPWATests = async () => {
    const results: string[] = [];
    
    // Service Worker 測試
    if ('serviceWorker' in navigator) {
      results.push('✅ Service Worker 支援可用');
      
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          results.push(`✅ 找到 ${registrations.length} 個已註冊的 Service Worker`);
        } else {
          results.push('❌ 沒有找到已註冊的 Service Worker');
        }
        
        if (navigator.serviceWorker.controller) {
          results.push('✅ 目前頁面有 Service Worker 控制');
        } else {
          results.push('❌ 目前頁面沒有 Service Worker 控制');
        }
      } catch (error) {
        results.push(`❌ Service Worker 檢查失敗: ${error}`);
      }
    } else {
      results.push('❌ 瀏覽器不支援 Service Worker');
    }

    // Manifest 測試
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      results.push('✅ 找到 manifest 連結');
      
      try {
        const response = await fetch((manifestLink as HTMLLinkElement).href);
        if (response.ok) {
          const manifest = await response.json();
          results.push(`✅ Manifest 載入成功: ${manifest.name || manifest.short_name}`);
        } else {
          results.push(`❌ Manifest 載入失敗: HTTP ${response.status}`);
        }
      } catch (error) {
        results.push(`❌ Manifest 載入失敗: ${error}`);
      }
    } else {
      results.push('❌ 沒有找到 manifest 連結');
    }

    // Cache API 測試
    if ('caches' in window) {
      results.push('✅ Cache API 支援');
      
      try {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          results.push(`✅ 找到 ${cacheNames.length} 個快取`);
        } else {
          results.push('⚠️ 沒有找到任何快取');
        }
      } catch (error) {
        results.push(`❌ 快取檢查失敗: ${error}`);
      }
    } else {
      results.push('❌ 瀏覽器不支援 Cache API');
    }

    // 安裝狀態檢查
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      results.push('✅ 應用程式以獨立模式運行（已安裝為 PWA）');
    } else {
      results.push('📱 應用程式未以獨立模式運行（可安裝為 PWA）');
    }

    // 網路狀態
    const onlineStatus = navigator.onLine ? '線上' : '離線';
    results.push(`🌐 網路狀態: ${onlineStatus}`);

    setTestResults(results);
  };

  useEffect(() => {
    if (isOpen) {
      runPWATests();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium transition-colors"
        title="PWA 功能測試"
      >
        🔧 PWA 測試
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl z-50 w-80 max-h-96 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">PWA 功能測試</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </div>
      
      <div className="p-3 space-y-2">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`text-xs p-2 rounded ${
              result.startsWith('✅') 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : result.startsWith('❌')
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                : result.startsWith('⚠️')
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            }`}
          >
            {result}
          </div>
        ))}
        
        <div className="pt-2 space-y-2">
          <button
            onClick={runPWATests}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-xs font-medium transition-colors"
          >
            🔄 重新測試
          </button>
          
          <button
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  registrations.forEach(registration => registration.unregister());
                });
              }
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              alert('快取已清除，建議重新整理頁面');
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-xs font-medium transition-colors"
          >
            🗑️ 清除快取
          </button>
        </div>
      </div>
    </div>
  );
};