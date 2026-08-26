import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error catcher for legacy browsers / cache issues
window.addEventListener('error', (e) => {
  console.error('Global Application Error:', e);
});

// Register Service Worker for PWA and Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = './sw.js';
    navigator.serviceWorker
      .register(swPath)
      .then((reg) => {
        reg.update();
      })
      .catch((err) => {
        console.log('SW registration note:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);



