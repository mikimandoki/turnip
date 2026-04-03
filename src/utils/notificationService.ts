import { addDays, isBefore } from 'date-fns';
import { z } from 'zod';

import type { Habit } from '../types';
import type { NotificationValue } from './notifications';

import { toDateString } from './date';
import { cancelHabitNotifications, scheduleHabitNotifications } from './localNotifications';
import { getDB, syncDB } from './sqlite';

const NotificationIdsSchema = z.array(z.number());

interface PendingNotificationResult {
  notificationIds: string | null;
}

export async function syncHabitNotification(habit: Habit, settings: NotificationValue, startDate: Date) {
  const db = await getDB();

  // 1. Fetch old IDs with a typed result
  const result = await db.query(
    `SELECT notificationIds FROM habit_notifications WHERE habitId = ?`,
    [habit.id]
  );

  // Cast the values to our specific interface to kill the 'any'
  const rows = (result.values || []) as PendingNotificationResult[];
  const firstRow = rows[0];

  if (firstRow?.notificationIds) {
    try {
      const parsed = JSON.parse(firstRow.notificationIds) as PendingNotificationResult;
      // Zod validates the structure and provides the correct type (number[])
      const oldIds = NotificationIdsSchema.parse(parsed);

      if (oldIds.length > 0) {
        await cancelHabitNotifications(oldIds);
      }
    } catch (e) {
      // If parsing or validation fails, we log it but don't crash
      console.warn(`[notifications] Failed to parse old IDs for habit ${habit.id}`, e);
    }
  }

  // 2. Schedule new ones using your "Beast" logic
  const newIds = await scheduleHabitNotifications(habit.id, habit.name, settings, startDate);

  // Find the max date scheduled to update 'lastScheduledAt'
  // (You might need to adjust your schedule function to return this,
  // or just estimate it as +30 days for now)
  // TODO I need more clarity on this. Is this the horizon date or the "I scheduled this last at" date
  const lastDate = toDateString(addDays(startDate, 30));

  // 3. Upsert to SQLite
  await db.run(
    `INSERT INTO habit_notifications (
      habitId, enabled, mode, time, days, monthDays, 
      customMessage, notificationIds, lastScheduledAt, intervalN, intervalUnit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(habitId) DO UPDATE SET
      enabled=excluded.enabled, mode=excluded.mode, time=excluded.time,
      days=excluded.days, monthDays=excluded.monthDays,
      customMessage=excluded.customMessage, notificationIds=excluded.notificationIds,
      lastScheduledAt=excluded.lastScheduledAt, 
      intervalN=excluded.intervalN, intervalUnit=excluded.intervalUnit;
  `,
    [
      habit.id,
      settings.enabled ? 1 : 0,
      settings.mode,
      settings.time,
      JSON.stringify(settings.days),
      JSON.stringify(settings.monthDays),
      settings.customMessage,
      JSON.stringify(newIds),
      lastDate,
      settings.intervalN,
      settings.intervalUnit,
    ]
  );

  await syncDB();
}

/**
 * Scans all habits and "tops up" notifications if they are 
 * within 7 days of running out.
 */
export async function performNotificationMaintenance(habits: Habit[]) {
  const now = new Date();
  const warningThreshold = addDays(now, 7); // We want at least a week of runway

  console.log('[maintenance] Checking notification horizons...');

  for (const habit of habits) {
    const { notification } = habit;

    // Skip if notifications are disabled or have no horizon yet
    if (!notification?.enabled || !notification.lastScheduledAt) continue;

    const horizon = new Date(notification.lastScheduledAt);

    // If the horizon (the last scheduled ping) is before our 7-day threshold...
    if (isBefore(horizon, warningThreshold)) {
      console.log(`[maintenance] 🚨 Top-up needed for: ${habit.name}`);

      // The new start date is the day AFTER the current horizon
      const nextBatchStart = addDays(horizon, 1);

      try {
        // This will schedule the next 30 and update the 'lastScheduledAt' in SQLite
        await syncHabitNotification(habit, notification, nextBatchStart);
        console.log(`[maintenance] ✅ Success: ${habit.name} topped up.`);
      } catch (error) {
        console.error(`[maintenance] ❌ Failed to top up ${habit.name}:`, error);
      }
    }
  }
}