import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.getturnip.app',
  appName: 'Turnip Habit Tracker',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      style: 'LIGHT',
    },
  },
};

export default config;
