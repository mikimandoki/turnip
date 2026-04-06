import { useEffect, useState } from 'react';

import type { Habit } from '../types';

import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/localNotifications';
import { performNotificationMaintenance } from '../utils/notificationService';
import { NOTIF_BLOCKED_MESSAGE } from '../utils/strings';
import { isNative } from '../utils/utils';

export type NotifPermissionPrompt = {
  title?: string;
  message: string;
  habits: Habit[];
  blocked?: boolean;
};

export function useNotificationPermission(habits: Habit[]) {
  const [osNotificationsGranted, setOsNotificationsGranted] = useState(false);
  const [notifPermissionPrompt, setNotifPermissionPrompt] = useState<NotifPermissionPrompt | null>(
    null
  );

  useEffect(() => {
    if (!isNative) return;
    void checkNotificationPermission().then(r => setOsNotificationsGranted(r === 'granted'));
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkNotificationPermission().then(r => setOsNotificationsGranted(r === 'granted'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isNative || habits.length === 0) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void performNotificationMaintenance(habits);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [habits]);

  async function recheckNotificationPermission() {
    if (!isNative) return;
    setOsNotificationsGranted((await checkNotificationPermission()) === 'granted');
  }

  function dismissNotifPrompt() {
    setNotifPermissionPrompt(null);
  }

  function confirmNotifPrompt() {
    const habitList = notifPermissionPrompt!.habits;
    void (async () => {
      const result = await requestNotificationPermission();
      if (result === 'blocked') {
        setNotifPermissionPrompt({ message: NOTIF_BLOCKED_MESSAGE, habits: [], blocked: true });
        return;
      }
      setNotifPermissionPrompt(null);
      const granted = result === 'granted';
      setOsNotificationsGranted(granted);
      if (granted) void performNotificationMaintenance(habitList);
    })();
  }

  return {
    osNotificationsGranted,
    notifPermissionPrompt,
    setNotifPermissionPrompt,
    recheckNotificationPermission,
    dismissNotifPrompt,
    confirmNotifPrompt,
  };
}
