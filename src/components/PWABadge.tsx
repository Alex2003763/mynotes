import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  if (offlineReady || needRefresh) {
    return (
      <div className="pwa-toast" role="alert">
        <div className="message">
          {offlineReady ? (
            <span>App ready to work offline</span>
          ) : (
            <span>New content available, click on reload button to update.</span>
          )}
        </div>
        {needRefresh && (
          <button className="reload" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
        )}
        <button className="close" onClick={() => {
          setOfflineReady(false);
          setNeedRefresh(false);
        }}>
          Close
        </button>
      </div>
    );
  }

  return null;
}

export default PWABadge;