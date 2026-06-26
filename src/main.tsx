import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker (guarded; non-fatal).
// Relative './sw.js' so it works on any host or subpath. Auto-applies new builds:
// when an updated worker installs, activate it and reload once so corrections land
// on the device without a manual cache clear.
if ('serviceWorker' in navigator) {
  let updatePending = false; // only reload for a real update, never on first install
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updatePending || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            // A new build is ready and an old one already controls the page -> swap in.
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              updatePending = true;
              (reg.waiting || next).postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch(() => {
        /* ignore registration failures (e.g. dev / unsupported / insecure origin) */
      });
  });
}
