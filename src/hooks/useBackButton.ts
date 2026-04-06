import { App } from '@capacitor/app';
import { useEffect } from 'react';

import { isNative } from '../utils/utils';

export function useBackButton() {
  useEffect(() => {
    if (!isNative) return;
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void App.exitApp();
      }
    });
    return () => {
      void listener.then(l => void l.remove());
    };
  }, []);
}
