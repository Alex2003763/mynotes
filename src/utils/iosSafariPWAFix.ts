/**
 * iOS Safari PWA 修正工具
 * 解決 iPhone Safari 刷新頁面時出現 "no network error" 的問題
 */

/**
 * 檢查是否為 iOS Safari
 */
export const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
};

/**
 * 檢查是否為 PWA 模式
 */
export const isPWAMode = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

/**
 * iOS Safari PWA 初始化修正
 */
export const initIOSSafariPWAFix = async (): Promise<void> => {
  if (!isIOSSafari() || !isPWAMode()) {
    return;
  }

  console.log('iOS Safari PWA: 正在應用修正...');

  // 1. 防止頁面刷新時的網路錯誤
  if ('serviceWorker' in navigator) {
    try {
      // 等待 Service Worker 準備就緒
      await navigator.serviceWorker.ready;
      
      // 監聽 Service Worker 狀態
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('iOS Safari PWA: Service Worker 控制器已更改');
      });

      // 檢查是否有等待中的 Service Worker
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        console.log('iOS Safari PWA: 發現等待中的 Service Worker');
        
        // 詢問用戶是否更新
        if (window.confirm('檢測到應用更新，是否立即重新載入？')) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      }
    } catch (error) {
      console.warn('iOS Safari PWA: Service Worker 初始化失敗:', error);
    }
  }

  // 2. 處理頁面可見性變化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('iOS Safari PWA: 頁面重新變為可見');
      
      // 檢查網路連線狀態
      if (!navigator.onLine) {
        console.log('iOS Safari PWA: 檢測到離線狀態');
        showOfflineMessage();
      }
    }
  });

  // 3. 網路狀態監聽
  window.addEventListener('online', () => {
    console.log('iOS Safari PWA: 網路重新連線');
    hideOfflineMessage();
  });

  window.addEventListener('offline', () => {
    console.log('iOS Safari PWA: 網路連線中斷');
    showOfflineMessage();
  });

  // 4. 防止意外的頁面刷新
  window.addEventListener('beforeunload', (event) => {
    if (isPWAMode() && isIOSSafari()) {
      // 在 iOS Safari PWA 模式下，警告用戶關於刷新的問題
      const message = '在 iOS Safari PWA 模式下刷新可能會遇到問題。建議使用應用內導航。';
      event.returnValue = message;
      return message;
    }
  });

  console.log('iOS Safari PWA: 修正已完成');
};

/**
 * 顯示離線訊息
 */
const showOfflineMessage = (): void => {
  const existingMessage = document.getElementById('ios-safari-offline-message');
  if (existingMessage) return;

  const offlineDiv = document.createElement('div');
  offlineDiv.id = 'ios-safari-offline-message';
  offlineDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff6b6b;
    color: white;
    text-align: center;
    padding: 8px;
    z-index: 9999;
    font-size: 14px;
  `;
  offlineDiv.textContent = '目前處於離線模式，某些功能可能無法使用';
  
  document.body.appendChild(offlineDiv);
};

/**
 * 隱藏離線訊息
 */
const hideOfflineMessage = (): void => {
  const offlineMessage = document.getElementById('ios-safari-offline-message');
  if (offlineMessage) {
    offlineMessage.remove();
  }
};

/**
 * 強制重新載入 Service Worker
 */
export const forceServiceWorkerUpdate = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker 不受支援');
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('iOS Safari PWA: 強制更新 Service Worker');
      await registration.update();
      
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  } catch (error) {
    console.error('iOS Safari PWA: 強制更新失敗:', error);
    throw error;
  }
};

/**
 * 清除所有快取並重新載入
 */
export const clearCacheAndReload = async (): Promise<void> => {
  if (!('caches' in window)) {
    throw new Error('Cache API 不受支援');
  }

  try {
    console.log('iOS Safari PWA: 清除快取並重新載入');
    
    // 清除所有快取
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );

    // 取消註冊 Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
    }

    // 重新載入頁面
    window.location.reload();
  } catch (error) {
    console.error('iOS Safari PWA: 清除快取失敗:', error);
    throw error;
  }
};

/**
 * 檢查並修復快取狀態
 */
export const checkAndFixCacheState = async (): Promise<void> => {
  if (!('caches' in window) || !isIOSSafari()) {
    return;
  }

  try {
    // 檢查關鍵快取是否存在
    const cache = await caches.open('workbox-precache-v2-http://localhost:4173/');
    const cachedResponse = await cache.match('/index.html');
    
    if (!cachedResponse) {
      console.log('iOS Safari PWA: 檢測到快取遺失，嘗試修復');
      
      // 嘗試重新快取關鍵資源
      try {
        const response = await fetch('/index.html');
        if (response.ok) {
          await cache.put('/index.html', response);
          console.log('iOS Safari PWA: 快取修復成功');
        }
      } catch (fetchError) {
        console.warn('iOS Safari PWA: 快取修復失敗:', fetchError);
      }
    }
  } catch (error) {
    console.warn('iOS Safari PWA: 快取狀態檢查失敗:', error);
  }
};

export default {
  isIOSSafari,
  isPWAMode,
  initIOSSafariPWAFix,
  forceServiceWorkerUpdate,
  clearCacheAndReload,
  checkAndFixCacheState
};