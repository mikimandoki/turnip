import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './index.css';

// For Capacitor builds calculate the screen height to make sure modals appear where they should
// without any keyboard avoidance nonsense
if (
  (
    window as unknown as { Capacitor?: { isNativePlatform: () => boolean } }
  ).Capacitor?.isNativePlatform()
) {
  document.documentElement.classList.add('native');
  document.documentElement.style.setProperty('--screen-height', `${window.screen.height}px`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
