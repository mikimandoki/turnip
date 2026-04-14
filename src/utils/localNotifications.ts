import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings';
import { addDays, endOfMonth, isAfter, setHours, setMinutes } from 'date-fns';

import { parseHabitEmoji } from './habits';
import { logger } from './logger';
import {
  habitNotificationId,
  type NotificationValue,
  windowedNotificationId,
} from './notifications';
import { isNative } from './utils';

export type ScheduledEntry = { id: number; scheduledAt: Date | null };

// Platform strategy: all functions are no-ops on web (guarded by isNative). UI components
// import isNative directly to hide native-only UI (bell icon, NotificationPicker, etc.).
//
// If native features grow, consider a thin platform service layer instead:
//   services/notifications.ts exports { supported, checkPermission, schedule, cancel }
// where checkPermission returns true on web (vs. false/denied ambiguity today), and
// `supported` replaces isNative imports in components. This keeps platform logic out of UI.

function getHabitNudge(): string {
  const messages = [
    "Don't forget your habit today!",
    'Ready to make some progress?',
    "Don't let your streak wilt today.",
    'Keep up the great work!',
    'Your future self will thank you!',
    'Time to crush those goals!',
    "Stay consistent, you're doing great!",
    "Don't forget to log your progress!",
    "Let's get to it!",
    'Time to check this off your list.',
    'Time for some daily growth.',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export async function openAppSettings(): Promise<void> {
  if (!isNative) return;
  await NativeSettings.open({
    optionAndroid: AndroidSettings.ApplicationDetails,
    optionIOS: IOSSettings.App,
  });
}

export async function checkNotificationPermission(): Promise<'blocked' | 'granted' | 'prompt'> {
  if (!isNative) return 'blocked';
  const { display } = await LocalNotifications.checkPermissions();
  if (display === 'granted') return 'granted';
  if (display === 'denied') return 'blocked';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<'blocked' | 'denied' | 'granted'> {
  if (!isNative) return 'denied';
  const { display: current } = await LocalNotifications.checkPermissions();
  if (current === 'denied') return 'blocked';
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted' ? 'granted' : 'denied';
}

// --- Perpetual builders (OS repeats forever, scheduledAt = null) ---

export function buildDailyNotifications(
  base: number,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number
): LocalNotificationSchema[] {
  return [{ id: base, title, body: getBody(), schedule: { on: { hour, minute }, repeats: true } }];
}

export function buildDowNotifications(
  base: number,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number,
  days: number[] // 1–7, Capacitor weekday convention
): LocalNotificationSchema[] {
  if (days.length === 7) return buildDailyNotifications(base, title, getBody, hour, minute);
  return days.map(weekday => ({
    id: base + weekday,
    title,
    body: getBody(),
    schedule: { on: { hour, minute, weekday }, repeats: true },
  }));
}

export function buildSafeDomNotifications(
  base: number,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number,
  days: number[] // only days 1–28
): LocalNotificationSchema[] {
  return days.map(day => ({
    id: base + day,
    title,
    body: getBody(),
    schedule: { on: { day, hour, minute }, repeats: true },
  }));
}

// --- Windowed builders (one-shot `at` timestamps, scheduledAt = occurrence date) ---

export function buildUnsafeDomNotifications(
  habitId: string,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number,
  days: number[], // only days 29–31
  from: Date,
  until: Date
): LocalNotificationSchema[] {
  const notifications: LocalNotificationSchema[] = [];
  days.forEach(day => {
    let month = from.getMonth();
    let year = from.getFullYear();
    // Walk month by month from `from` to `until`
    while (new Date(year, month, 1) <= until) {
      const clampedDay = Math.min(day, endOfMonth(new Date(year, month)).getDate());
      const occurrence = setMinutes(setHours(new Date(year, month, clampedDay), hour), minute);
      if (isAfter(occurrence, from) && occurrence <= until) {
        notifications.push({
          id: windowedNotificationId(habitId, occurrence),
          title,
          body: getBody(),
          schedule: { at: occurrence },
        });
      }
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  });
  return notifications;
}

export function buildIntervalNotifications(
  habitId: string,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number,
  intervalDays: number,
  from: Date,
  until: Date
): LocalNotificationSchema[] {
  const anchor = new Date(from);
  anchor.setHours(hour, minute, 0, 0);
  // Advance one day at a time until anchor is strictly after `from`.
  // Using < (not <=) so that when maintenance passes horizon+intervalDays as `from`,
  // anchor landing exactly on that timestamp is used directly, not skipped.
  while (anchor < from) anchor.setDate(anchor.getDate() + 1);

  const notifications: LocalNotificationSchema[] = [];
  let current = new Date(anchor);
  while (current <= until) {
    notifications.push({
      id: windowedNotificationId(habitId, current),
      title,
      body: getBody(),
      schedule: { at: new Date(current) },
    });
    current = addDays(current, intervalDays);
  }
  return notifications;
}

/**
 * Schedules OS notifications for a habit within [from, until].
 * - Perpetual modes (daily, dow, dom 1–28): schedules repeating OS notifications, returns scheduledAt=null.
 * - Windowed modes (interval, dom 29–31): schedules one-shot `at` notifications, returns scheduledAt=occurrence.
 *
 * `until` is only meaningful for windowed modes. Defaults to 30 days out.
 */
export async function scheduleHabitNotifications(
  habitId: string,
  habitName: string,
  notif: NotificationValue,
  from: Date,
  until: Date = addDays(from, 30)
): Promise<ScheduledEntry[]> {
  if (!isNative || !notif.enabled) return [];

  const [hour, minute] = notif.time.split(':').map(Number);
  const base = habitNotificationId(habitId);
  const title = parseHabitEmoji(habitName).cleanName;
  const custom = notif.customMessage.trim();
  const getBody = custom ? () => custom : getHabitNudge;

  let perpetual: LocalNotificationSchema[] = [];
  let windowed: LocalNotificationSchema[] = [];

  switch (notif.mode) {
    case 'daily':
      perpetual = buildDailyNotifications(base, title, getBody, hour, minute);
      break;
    case 'days-of-week':
      perpetual = buildDowNotifications(base, title, getBody, hour, minute, notif.days);
      break;
    case 'days-of-month': {
      const safe = notif.monthDays.filter(d => d <= 28);
      const unsafe = notif.monthDays.filter(d => d > 28);
      if (safe.length)
        perpetual = buildSafeDomNotifications(base, title, getBody, hour, minute, safe);
      if (unsafe.length)
        windowed = buildUnsafeDomNotifications(
          habitId,
          title,
          getBody,
          hour,
          minute,
          unsafe,
          from,
          until
        );
      break;
    }
    case 'interval':
      windowed = buildIntervalNotifications(
        habitId,
        title,
        getBody,
        hour,
        minute,
        (notif.intervalN ?? 1) * (notif.intervalUnit === 'weeks' ? 7 : 1),
        from,
        until
      );
      break;
  }

  const all = [...perpetual, ...windowed];
  logger.debug('notifications', 'schedule', { habitId, habitName, count: all.length });

  if (isNative && all.length > 0) {
    await LocalNotifications.schedule({ notifications: all });
  }

  return [
    ...perpetual.map(n => ({ id: n.id, scheduledAt: null as Date | null })),
    ...windowed.map(n => ({ id: n.id, scheduledAt: n.schedule!.at as Date })),
  ];
}

export async function cancelHabitNotifications(notificationIds: number[]): Promise<void> {
  if (!isNative || notificationIds.length === 0) return;
  logger.debug('notifications', 'cancel', { notificationIds });
  if (isNative) {
    await LocalNotifications.cancel({
      notifications: notificationIds.map(id => ({ id })),
    });
  }
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
