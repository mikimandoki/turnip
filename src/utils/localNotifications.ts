import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { addDays, endOfMonth, setHours, setMinutes, startOfDay } from 'date-fns';

import { parseHabitEmoji } from './habits';
import { habitNotificationId, type NotificationValue } from './notifications';
import { isCapacitorNative, isNative } from './utils';

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

// Number of future `at` occurrences to pre-schedule for interval/days-of-month edge cases
const AT_LOOKAHEAD = 30;

function getNextOccurrenceAt(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = setMinutes(setHours(startOfDay(now), hour), minute);
  return candidate <= now ? addDays(candidate, 1) : candidate;
}

function buildDailyNotifications(
  base: number,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number
): LocalNotificationSchema[] {
  return [
    {
      id: base,
      title,
      body: getBody(),
      schedule: { on: { hour, minute }, repeats: true },
    },
  ];
}

function buildDowNotifications(
  base: number,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number,
  days: number[] // 1–7, Capacitor weekday convention
): LocalNotificationSchema[] {
  // All 7 days selected — secretly treat as daily, save 6 slots
  if (days.length === 7) {
    return buildDailyNotifications(base, title, getBody, hour, minute);
  }
  return days.map(weekday => ({
    id: base + weekday,
    title,
    body: getBody(),
    schedule: { on: { hour, minute, weekday }, repeats: true },
  }));
}

function buildDaysOfMonthNotifications(
  base: number,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number,
  days: number[] // 1–31
): LocalNotificationSchema[] {
  const safeDays = days.filter(d => d <= 28);
  const unsafeDays = days.filter(d => d > 28);

  const nativeNotifs: LocalNotificationSchema[] = safeDays.map(day => ({
    id: base + day,
    title,
    body: getBody(),
    schedule: { on: { day, hour, minute }, repeats: true },
  }));

  // Days 29–31: compute next AT_LOOKAHEAD occurrences, clamping to end of month
  const atNotifs: LocalNotificationSchema[] = [];
  unsafeDays.forEach((day, dayIndex) => {
    const now = new Date();
    let count = 0;
    let month = now.getMonth(); // 0-indexed
    let year = now.getFullYear();

    while (count < AT_LOOKAHEAD) {
      const lastDayOfMonth = endOfMonth(new Date(year, month)).getDate();
      const clampedDay = Math.min(day, lastDayOfMonth);
      const occurrence = setMinutes(setHours(new Date(year, month, clampedDay), hour), minute);
      if (occurrence > now) {
        atNotifs.push({
          // offset by 100 + dayIndex * AT_LOOKAHEAD + count to avoid ID collisions
          id: base + 100 + dayIndex * AT_LOOKAHEAD + count,
          title,
          body: getBody(),
          schedule: { at: occurrence },
        });
        count++;
      }
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  });

  return [...nativeNotifs, ...atNotifs];
}

function buildIntervalNotifications(
  base: number,
  title: string,
  getBody: () => string,
  hour: number,
  minute: number,
  intervalDays: number
): LocalNotificationSchema[] {
  // No native support for arbitrary intervals — pre-schedule AT_LOOKAHEAD occurrences
  const start = getNextOccurrenceAt(hour, minute);
  return Array.from({ length: AT_LOOKAHEAD }, (_, i) => ({
    id: base + 200 + i,
    title,
    body: getBody(),
    schedule: { at: addDays(start, i * intervalDays) },
  }));
}

export async function scheduleHabitNotifications(
  habitId: string,
  habitName: string,
  notif: NotificationValue
): Promise<number[]> {
  if (!isNative || !notif.enabled) return [];

  const [hour, minute] = notif.time.split(':').map(Number);
  const base = habitNotificationId(habitId);
  const title = parseHabitEmoji(habitName).cleanName;
  const custom = notif.customMessage.trim();
  const getBody = custom ? () => custom : getHabitNudge;

  let notifications: LocalNotificationSchema[] = [];

  switch (notif.mode) {
    case 'daily':
      notifications = buildDailyNotifications(base, title, getBody, hour, minute);
      break;
    case 'days-of-week':
      notifications = buildDowNotifications(base, title, getBody, hour, minute, notif.days);
      break;
    case 'days-of-month':
      notifications = buildDaysOfMonthNotifications(
        base,
        title,
        getBody,
        hour,
        minute,
        notif.monthDays
      );
      break;
    case 'interval':
      notifications = buildIntervalNotifications(
        base,
        title,
        getBody,
        hour,
        minute,
        (notif.intervalN ?? 1) * (notif.intervalUnit === 'weeks' ? 7 : 1)
      );
      break;
  }

  console.log('[notifications] schedule', { habitId, habitName, notif, notifications });

  if (isCapacitorNative) {
    await LocalNotifications.schedule({ notifications });
  }

  // Return registered IDs so caller can persist them on the habit
  return notifications.map(n => n.id);
}

export async function cancelHabitNotifications(notificationIds: number[]): Promise<void> {
  if (!isNative || notificationIds.length === 0) return;
  console.log('[notifications] cancel', { notificationIds });
  if (isCapacitorNative) {
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
