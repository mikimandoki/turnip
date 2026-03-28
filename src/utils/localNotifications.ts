import { LocalNotifications } from '@capacitor/local-notifications';

import { habitNotificationId } from './notifications';
import { isNative } from './utils';

// Platform strategy: all functions are no-ops on web (guarded by isNative). UI components
// import isNative directly to hide native-only UI (bell icon, NotificationPicker, etc.).
//
// If native features grow, consider a thin platform service layer instead:
//   services/notifications.ts exports { supported, checkPermission, schedule, cancel }
// where checkPermission returns true on web (vs. false/denied ambiguity today), and
// `supported` replaces isNative imports in components. This keeps platform logic out of UI.

export async function checkNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function scheduleHabitNotifications(
  habitId: string,
  habitName: string,
  time: string,
  days: number[]
): Promise<void> {
  if (!isNative) return;
  const [hour, minute] = time.split(':').map(Number);
  const base = habitNotificationId(habitId);
  await LocalNotifications.schedule({
    notifications: days.map(weekday => ({
      id: base + weekday,
      title: habitName,
      body: 'Time to log your habit!',
      schedule: {
        on: { hour, minute, weekday },
        repeats: true,
      },
    })),
  });
}

export async function cancelHabitNotifications(habitId: string, days: number[]): Promise<void> {
  if (!isNative) return;
  const base = habitNotificationId(habitId);
  await LocalNotifications.cancel({
    notifications: days.map(weekday => ({ id: base + weekday })),
  });
}

export async function getPendingNotifications() {
  if (!isNative) return { notifications: [] };
  return LocalNotifications.getPending();
}

export async function cancelAllHabitNotifications(): Promise<void> {
  if (!isNative) return;
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length === 0) return;
  await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
}
