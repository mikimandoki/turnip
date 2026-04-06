import { addDays, isBefore } from 'date-fns';

import type { Habit } from '../types';
import type { NotificationValue } from './notifications';

import {
  cancelHabitNotifications,
  checkNotificationPermission,
  scheduleHabitNotifications,
} from './localNotifications';
import { habitNotificationId } from './notifications';
import { getDB, syncDB } from './sqlite';

/**
 * Returns all OS notification IDs that could possibly be registered for a habit.
 * Used for cancellation before rescheduling — covers both perpetual and windowed IDs.
 *
 * Perpetual IDs are deterministic (base, base+day 1–28).
 * Windowed IDs are read from the queue.
 */
async function getAllNotificationIdsForHabit(habitId: string): Promise<number[]> {
  const db = await getDB();
  const base = habitNotificationId(habitId);

  // Perpetual range: daily (base), dow (base+1..+7), safe dom (base+1..+28)
  const perpetualIds: number[] = [base];
  for (let i = 1; i <= 28; i++) perpetualIds.push(base + i);

  // Windowed: whatever is currently in the queue
  const result = await db.query(
    `SELECT osNotificationId FROM notification_queue WHERE habitId = ?`,
    [habitId]
  );
  const queueIds = (result.values ?? []).map(
    (r: { osNotificationId: number }) => r.osNotificationId
  );

  return [...perpetualIds, ...queueIds];
}

/**
 * Cancels all OS notifications for a habit (perpetual + queued) without touching the DB.
 * Use before deleting a habit.
 */
export async function cancelNotificationsForHabit(habitId: string): Promise<void> {
  const ids = await getAllNotificationIdsForHabit(habitId);
  await cancelHabitNotifications(ids);
}

/**
 * Cancels all existing OS notifications for a habit, clears the queue,
 * schedules fresh notifications, and persists settings to the habit row.
 */
export async function syncHabitNotification(
  habit: Habit,
  settings: NotificationValue,
  from: Date
): Promise<void> {
  if ((await checkNotificationPermission()) !== 'granted') return;
  const db = await getDB();

  // 1. Cancel all existing OS notifications for this habit
  const oldIds = await getAllNotificationIdsForHabit(habit.id);
  await cancelHabitNotifications(oldIds);

  // 2. Clear the queue
  await db.run(`DELETE FROM notification_queue WHERE habitId = ?`, [habit.id]);

  // 3. Schedule fresh notifications
  // TODO: magic number — extract 30 to a named constant (e.g. NOTIFICATION_WINDOW_DAYS).
  // Same value appears in performNotificationMaintenance below; keep them in sync.
  const until = addDays(from, 30);
  const scheduled = await scheduleHabitNotifications(habit.id, habit.name, settings, from, until);

  // 4. Insert windowed entries into queue
  const windowed = scheduled.filter(s => s.scheduledAt !== null);
  for (const entry of windowed) {
    await db.run(
      `INSERT INTO notification_queue (habitId, scheduledAt, osNotificationId) VALUES (?, ?, ?)`,
      [habit.id, entry.scheduledAt!.toISOString(), entry.id]
    );
  }

  // 5. Persist notification settings onto the habit row
  await db.run(
    `UPDATE habits SET
      notif_enabled = ?, notif_mode = ?, notif_time = ?, notif_days = ?,
      notif_monthDays = ?, notif_customMessage = ?, notif_intervalN = ?, notif_intervalUnit = ?
    WHERE id = ?`,
    [
      settings.enabled ? 1 : 0,
      settings.mode,
      settings.time,
      JSON.stringify(settings.days),
      JSON.stringify(settings.monthDays),
      settings.customMessage,
      settings.intervalN,
      settings.intervalUnit,
      habit.id,
    ]
  );

  await syncDB();
}

function isWindowedMode(notification: NotificationValue): boolean {
  if (notification.mode === 'interval') return true;
  if (notification.mode === 'days-of-month') return notification.monthDays.some(d => d > 28);
  return false;
}

/**
 * Tops up windowed notification queues for any habit whose runway is within 7 days.
 * Perpetual modes (daily, dow, safe dom) never need maintenance.
 */
export async function performNotificationMaintenance(habits: Habit[]): Promise<void> {
  const db = await getDB();
  const now = new Date();
  const warningThreshold = addDays(now, 7);

  // Prune fired entries so the queue doesn't grow indefinitely
  await db.run(`DELETE FROM notification_queue WHERE scheduledAt < ?`, [now.toISOString()]);

  console.log('[maintenance] Checking notification horizons...');

  for (const habit of habits) {
    const { notification } = habit;
    if (!notification?.enabled || !isWindowedMode(notification)) continue;

    const stepDays =
      notification.mode === 'interval'
        ? (notification.intervalN ?? 1) * (notification.intervalUnit === 'weeks' ? 7 : 1)
        : 1;

    // Ensure `until` is always far enough to fit at least one more occurrence beyond the horizon
    // TODO: the 30 here should be the same NOTIFICATION_WINDOW_DAYS constant as in syncHabitNotification.
    const until = addDays(now, Math.max(30, stepDays + 7));

    const result = await db.query(
      `SELECT MAX(scheduledAt) as maxDate FROM notification_queue WHERE habitId = ?`,
      [habit.id]
    );
    const maxDate: string | null =
      (result.values?.[0] as { maxDate: string | null } | undefined)?.maxDate ?? null;

    const horizon = maxDate ? new Date(maxDate) : null;

    if (!horizon || isBefore(horizon, warningThreshold)) {
      console.log(`[maintenance] Top-up needed for: ${habit.name}`);
      // For interval mode the next occurrence is exactly horizon + intervalDays.
      // For unsafe DOM mode +1 is correct — the builder scans month-by-month from there.
      const from = horizon ? addDays(horizon, stepDays) : now;

      try {
        const scheduled = await scheduleHabitNotifications(
          habit.id,
          habit.name,
          notification,
          from,
          until
        );
        for (const entry of scheduled.filter(s => s.scheduledAt !== null)) {
          await db.run(
            `INSERT OR IGNORE INTO notification_queue (habitId, scheduledAt, osNotificationId) VALUES (?, ?, ?)`,
            [habit.id, entry.scheduledAt!.toISOString(), entry.id]
          );
        }
        await syncDB();
        console.log(`[maintenance] ✅ Topped up: ${habit.name}`);
      } catch (error) {
        console.error(`[maintenance] ❌ Failed to top up ${habit.name}:`, error);
      }
    }
  }
}
