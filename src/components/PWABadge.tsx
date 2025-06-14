import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function PWABadge() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r);
      
      // iOS Safari 特殊處理
      if (isIOS && r) {
        // 強制立即激活 Service Worker
        r.addEventListener('updatefound', () => {
          const newWorker = r.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('Service Worker 已激活');
                setOfflineReady(true);
              }
            });
          }
        });
      }
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    // 檢測 iOS 設備
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
    
    // 檢測是否為獨立模式 (PWA)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  if (offlineReady || needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 z-50" role="alert">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {offlineReady ? (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {offlineReady ? (
                isIOS && !isStandalone ? (
                  <span>應用程式可離線使用！建議添加到主屏幕以獲得更好體驗。</span>
                ) : (
                  <span>應用程式已準備好離線使用</span>
                )
              ) : (
                <span>有新內容可用，點擊重新載入更新</span>
              )}
            </p>
            {isIOS && !isStandalone && offlineReady && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                在 Safari 中點擊分享按鈕 → 「加入主畫面」
              </p>
            )}
          </div>
          <div className="flex-shrink-0 space-x-2">
            {needRefresh && (
              <button
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
                onClick={() => updateServiceWorker(true)}
              >
                更新
              </button>
            )}
            <button
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              onClick={() => {
                setOfflineReady(false);
                setNeedRefresh(false);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default PWABadge;