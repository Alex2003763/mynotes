/**
 * PWA 相關工具函數
 */

/**
 * 檢查瀏覽器是否支援 PWA 功能
 */
export const isPWASupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    'Cache' in window &&
    'caches' in window
  );
};

/**
 * 檢查應用是否已安裝為 PWA
 */
export const isPWAInstalled = (): boolean => {
  // 檢查 display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // 檢查 iOS Safari
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // 檢查是否從主畫面啟動 (Android)
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  
  return false;
};

/**
 * 檢查是否為行動裝置
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * 檢查是否為 iOS 裝置
 */
export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * 檢查是否為 Android 裝置
 */
export const isAndroidDevice = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * 取得裝置類型
 */
export const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  if (/tablet|ipad/i.test(navigator.userAgent)) {
    return 'tablet';
  }
  if (isMobileDevice()) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * 檢查 Service Worker 註冊狀態
 */
export const getServiceWorkerStatus = async (): Promise<{
  registered: boolean;
  active: boolean;
  waiting: boolean;
  registration?: ServiceWorkerRegistration;
}> => {
  if (!('serviceWorker' in navigator)) {
    return { registered: false, active: false, waiting: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      return { registered: false, active: false, waiting: false };
    }

    return {
      registered: true,
      active: !!registration.active,
      waiting: !!registration.waiting,
      registration,
    };
  } catch (error) {
    console.error('Error checking service worker status:', error);
    return { registered: false, active: false, waiting: false };
  }
};

/**
 * 清除所有快取
 */
export const clearAllCaches = async (): Promise<void> => {
  if (!('caches' in window)) {
    throw new Error('Cache API not supported');
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared successfully');
  } catch (error) {
    console.error('Error clearing caches:', error);
    throw error;
  }
};

/**
 * 取得快取資訊
 */
export const getCacheInfo = async (): Promise<{
  cacheNames: string[];
  totalSize: number;
  cacheDetails: Record<string, number>;
}> => {
  if (!('caches' in window)) {
    throw new Error('Cache API not supported');
  }

  try {
    const cacheNames = await caches.keys();
    const cacheDetails: Record<string, number> = {};
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      let cacheSize = 0;
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          cacheSize += blob.size;
        }
      }
      
      cacheDetails[cacheName] = cacheSize;
      totalSize += cacheSize;
    }

    return {
      cacheNames,
      totalSize,
      cacheDetails,
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    throw error;
  }
};

/**
 * 格式化檔案大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 檢查網路連線狀態
 */
export const getNetworkStatus = (): {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
} => {
  const online = navigator.onLine;
  
  // 檢查 Network Information API
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  if (connection) {
    return {
      online,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      saveData: connection.saveData,
    };
  }
  
  return { online };
};

/**
 * 註冊 PWA 更新檢查
 */
export const registerUpdateCheck = (intervalMs: number = 60000): (() => void) => {
  let intervalId: NodeJS.Timeout;
  
  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  };
  
  // 立即檢查一次
  checkForUpdates();
  
  // 設定定期檢查
  intervalId = setInterval(checkForUpdates, intervalMs);
  
  // 返回清理函數
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

/**
 * PWA 安裝引導訊息
 */
export const getInstallInstructions = (): {
  platform: string;
  instructions: string[];
} => {
  if (isIOSDevice()) {
    return {
      platform: 'iOS',
      instructions: [
        '點擊 Safari 底部的分享按鈕',
        '向下滾動並選擇「加入主畫面」',
        '點擊「加入」完成安裝',
      ],
    };
  }
  
  if (isAndroidDevice()) {
    return {
      platform: 'Android',
      instructions: [
        '點擊瀏覽器選單 (三個點)',
        '選擇「加入主畫面」或「安裝應用程式」',
        '點擊「安裝」完成安裝',
      ],
    };
  }
  
  return {
    platform: 'Desktop',
    instructions: [
      '點擊網址列右側的安裝圖示',
      '或點擊瀏覽器選單中的「安裝」選項',
      '確認安裝以將應用程式加入桌面',
    ],
  };
};