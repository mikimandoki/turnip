import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './index.css';

// Use screen.height for stable modal positioning — unlike svh/vh it doesn't recalculate
// when the keyboard appears. Also add .native class for any other platform-specific styles.
document.documentElement.style.setProperty('--screen-height', `${window.screen.height}px`);
if (
  (
    window as unknown as { Capacitor?: { isNativePlatform: () => boolean } }
  ).Capacitor?.isNativePlatform()
) {
  document.documentElement.classList.add('native');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
