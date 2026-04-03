import { addDays } from 'date-fns';
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

export async function syncHabitNotification(habit: Habit, settings: NotificationValue) {
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
  const newIds = await scheduleHabitNotifications(habit.id, habit.name, settings);

  // Find the max date scheduled to update 'lastScheduledAt'
  // (You might need to adjust your schedule function to return this,
  // or just estimate it as +30 days for now)
  const lastDate = toDateString(addDays(new Date(), 30));

  // 3. Upsert to SQLite
  await db.run(
    /* sql */ `
    INSERT INTO habit_notifications (
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
