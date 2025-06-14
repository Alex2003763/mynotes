import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  needsUpdate: boolean;
  isOfflineReady: boolean;
}

interface PWAActions {
  install: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
}

interface UsePWAReturn {
  status: PWAStatus;
  actions: PWAActions;
}

export const usePWA = (): UsePWAReturn => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    // 檢查是否已安裝
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true);
      }
    };

    // 監聽安裝提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 監聽應用程式安裝完成
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // 監聽網路狀態變化
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    checkIfInstalled();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async (): Promise<void> => {
    if (!deferredPrompt) {
      throw new Error('No install prompt available');
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install error:', error);
      throw error;
    }
  };

  const update = async (): Promise<void> => {
    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  };

  const skipWaiting = (): void => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    status: {
      isInstallable: !!deferredPrompt,
      isInstalled,
      isOnline,
      needsUpdate: needRefresh,
      isOfflineReady: offlineReady,
    },
    actions: {
      install,
      update,
      skipWaiting,
    },
  };
};

export default usePWA;