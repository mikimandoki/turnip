import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.getturnip.app',
  appName: 'Turnip Habit Tracker',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
    },
  },
};

export default config;
