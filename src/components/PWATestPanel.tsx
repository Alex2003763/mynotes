import React, { useState, useEffect } from 'react';

export const PWATestPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runPWATests = async () => {
    const results: string[] = [];
    
    results.push('🚀 Running PWA Diagnostics...');

    // 1. Service Worker Test
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          results.push(`✅ Service Worker is registered (${registrations.length} found).`);
          const reg = registrations[0];
          results.push(`   - Scope: ${reg.scope}`);
          results.push(`   - Status: ${reg.active ? 'active' : 'waiting/installing'}`);
        } else {
          results.push('❌ No Service Worker is registered.');
        }
      } catch (error) {
        results.push(`❌ Error checking Service Worker: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      results.push('❌ Service Worker API not supported by this browser.');
    }

    // 2. Manifest Test
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      try {
        const response = await fetch((manifestLink as HTMLLinkElement).href);
        if (response.ok) {
          const manifest = await response.json();
          results.push(`✅ Manifest loaded successfully: ${manifest.short_name || manifest.name}`);
        } else {
          results.push(`❌ Failed to load manifest: HTTP ${response.status}`);
        }
      } catch (error) {
        results.push(`❌ Error fetching manifest: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      results.push('❌ Manifest link not found in HTML.');
    }

    // 3. Cache API Test
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          results.push(`✅ Caches found (${cacheNames.length}):`);
          cacheNames.forEach(name => results.push(`   - ${name}`));
        } else {
          results.push('⚠️ No caches found.');
        }
      } catch (error) {
        results.push(`❌ Error accessing caches: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      results.push('❌ Cache API not supported.');
    }

    // 4. Installation Status
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      results.push('✅ App is running in standalone (PWA) mode.');
    } else {
      results.push('📱 App is running in browser mode.');
    }

    // 5. Network Status
    results.push(navigator.onLine ? '🌐 Network status: Online' : '🔌 Network status: Offline');

    setTestResults(results);
  };

  useEffect(() => {
    if (isOpen) {
      runPWATests();
    }
  }, [isOpen]);

  const clearPWAState = async () => {
    try {
      // 先清除所有快取
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }

      // 然後取消註冊所有 Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 清除 localStorage 中的 Workbox 相關資料
      Object.keys(localStorage).forEach(key => {
        if (key.includes('workbox') || key.includes('sw-precache')) {
          localStorage.removeItem(key);
        }
      });

      alert('PWA 快取和 Service Workers 已清除。請完全關閉並重新開啟應用程式。');
      
      // 強制重新載入頁面以確保清除生效
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      alert(`清除 PWA 狀態時發生錯誤: ${error}`);
    }
  };

  const fixCacheConflicts = async () => {
    try {
      const results: string[] = [];
      
      // 專門針對生產環境的快取衝突問題
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        // 查找並刪除有問題的快取
        for (const cacheName of cacheNames) {
          if (cacheName.includes('precache') || cacheName.includes('workbox')) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            // 檢查是否有重複的 index.html 條目
            const indexEntries = requests.filter(req =>
              req.url.includes('/index.html') || req.url.endsWith('/')
            );
            
            if (indexEntries.length > 1) {
              // 刪除整個快取以解決衝突
              await caches.delete(cacheName);
              results.push(`🔧 已刪除有衝突的快取: ${cacheName}`);
            }
          }
        }
      }
      
      if (results.length > 0) {
        alert(`快取衝突已修復:\n${results.join('\n')}\n\n請重新載入頁面。`);
        setTimeout(() => window.location.reload(), 500);
      } else {
        alert('未發現快取衝突問題。');
      }
      
    } catch (error) {
      alert(`修復快取衝突時發生錯誤: ${error}`);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-full shadow-lg z-50 text-xs font-medium transition-colors"
        title="PWA Diagnostics"
      >
        🔧
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl z-50 w-80 max-h-96 overflow-y-auto text-xs">
      <div className="sticky top-0 bg-white dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">PWA Diagnostics</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-lg"
        >
          &times;
        </button>
      </div>
      
      <div className="p-2">
        <pre className="whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300">
          {testResults.join('\n')}
        </pre>
        
        <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-600 space-y-2">
          <button
            onClick={runPWATests}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded font-medium transition-colors"
          >
            Refresh Diagnostics
          </button>
          <button
            onClick={fixCacheConflicts}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-3 rounded font-medium transition-colors"
          >
            Fix Cache Conflicts
          </button>
          <button
            onClick={clearPWAState}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded font-medium transition-colors"
          >
            Clear All Caches & SW
          </button>
        </div>
      </div>
    </div>
  );
};