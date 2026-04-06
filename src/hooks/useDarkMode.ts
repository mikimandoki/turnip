import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { loadFromStorage, saveToStorage } from '../utils/localStorage';

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    void loadFromStorage('darkMode', null, z.boolean().nullable()).then(stored => {
      setDarkMode(stored ?? window.matchMedia('(prefers-color-scheme: dark)').matches);
    });
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.setAttribute('data-theme', 'dark');
      html.removeAttribute('data-accent');
      void SystemBars.setStyle({ style: SystemBarsStyle.Dark });
    } else {
      html.removeAttribute('data-theme');
      html.setAttribute('data-accent', 'green');
      void SystemBars.setStyle({ style: SystemBarsStyle.Light });
    }
  }, [darkMode]);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    void saveToStorage('darkMode', next);
  }

  return { darkMode, toggleDarkMode };
}
