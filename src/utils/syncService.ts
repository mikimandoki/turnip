import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { z } from 'zod';

import { type Completion, CompletionRowSchema, type Habit, type HabitGroup } from '../types';

// Minimal schema for the fields syncOnSignIn actually reads and pushes to Supabase.
// Notification settings are device-local and never synced remotely.
const SyncHabitRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
  times: z.number(),
  periodLength: z.number(),
  periodUnit: z.enum(['day', 'week', 'month']),
  groupId: z.string().nullable(),
  sortOrder: z.number(),
  updated_at: z.string().nullable(),
  archive_runs: z.string().nullable(),
});
import { logger } from './logger';
import { supabase } from './supabase';
import {
  isSupabasePausedError,
  reportFailure,
  reportSuccess,
  shouldAttempt,
} from './supabaseMonitor';

function handleSyncResult(op: string, error: unknown): void {
  if (error) {
    logger.error('sync', `${op} failed`, error);
    if (isSupabasePausedError(error)) reportFailure();
  } else {
    reportSuccess();
  }
}

async function getUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export function toRemoteHabit(habit: Habit, userId: string, sortOrder: number, now: string) {
  return {
    id: habit.id,
    user_id: userId,
    name: habit.name,
    note: habit.note ?? null,
    created_at: habit.createdAt,
    times: habit.frequency.times,
    period_length: habit.frequency.periodLength,
    period_unit: habit.frequency.periodUnit,
    sort_order: sortOrder,
    group_id: habit.groupId ?? null,
    archive_runs: habit.archiveRuns ? JSON.stringify(habit.archiveRuns) : null,
    updated_at: now,
    deleted_at: null,
  };
}

export function toRemoteGroup(group: HabitGroup, userId: string, now: string) {
  return {
    id: group.id,
    user_id: userId,
    name: group.name,
    sort_order: group.sortOrder ?? 0,
    updated_at: now,
    deleted_at: null,
  };
}

export async function pushHabit(habit: Habit, sortOrder: number): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;
  const { error } = await supabase
    .from('habits')
    .upsert(toRemoteHabit(habit, user.id, sortOrder, new Date().toISOString()));
  handleSyncResult('pushHabit', error);
}

export async function softDeleteHabit(habitId: string): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;
  const now = new Date().toISOString();
  const [habitRes, compRes] = await Promise.all([
    supabase.from('habits').update({ deleted_at: now }).eq('id', habitId).eq('user_id', user.id),
    supabase
      .from('completions')
      .update({ deleted_at: now })
      .eq('habit_id', habitId)
      .eq('user_id', user.id),
  ]);
  const habitErr = habitRes.error;
  const compErr = compRes.error;
  if (habitErr) {
    logger.error('sync', 'softDeleteHabit failed', habitErr.message);
    if (isSupabasePausedError(habitErr)) reportFailure();
  }
  if (compErr) {
    logger.error('sync', 'softDeleteHabit completions failed', compErr.message);
    if (isSupabasePausedError(compErr)) reportFailure();
  }
  if (!habitErr && !compErr) reportSuccess();
}

export async function deleteSupabaseAccount(): Promise<{ error?: string }> {
  const { error } = (await supabase.functions.invoke('delete-account')) as { error: unknown };
  if (error) {
    if (isSupabasePausedError(error)) reportFailure();
    return { error: error instanceof Error ? error.message : 'Failed to delete account' };
  }
  reportSuccess();
  return {};
}

export async function softDeleteAllHabits(): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;
  const { error } = await supabase
    .from('habits')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('deleted_at', null);
  handleSyncResult('softDeleteAllHabits', error);
}

export async function pushGroup(group: HabitGroup): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;
  const { error } = await supabase
    .from('habit_groups')
    .upsert(toRemoteGroup(group, user.id, new Date().toISOString()));
  handleSyncResult('pushGroup', error);
}

export async function softDeleteGroup(groupId: string): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('habit_groups')
    .update({ deleted_at: now })
    .eq('id', groupId)
    .eq('user_id', user.id);
  handleSyncResult('softDeleteGroup', error);
}

export async function pushAllGroups(groups: HabitGroup[]): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user || groups.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('habit_groups')
    .upsert(groups.map(g => toRemoteGroup(g, user.id, now)));
  handleSyncResult('pushAllGroups', error);
}

export async function pushAllHabits(habits: Habit[]): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user || habits.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('habits')
    .upsert(habits.map((h, i) => toRemoteHabit(h, user.id, i, now)));
  handleSyncResult('pushAllHabits', error);
}

export async function pushCompletion(habitId: string, date: string, count: number): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;
  const { error } = await supabase.from('completions').upsert({
    user_id: user.id,
    habit_id: habitId,
    date,
    count,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  });
  handleSyncResult('pushCompletion', error);
}

export async function softDeleteCompletion(habitId: string, date: string): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('completions').upsert({
    user_id: user.id,
    habit_id: habitId,
    date,
    count: 0,
    updated_at: now,
    deleted_at: now,
  });
  handleSyncResult('softDeleteCompletion', error);
}

export async function pushAllCompletions(completions: Completion[]): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user || completions.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('completions').upsert(
    completions.map(c => ({
      user_id: user.id,
      habit_id: c.habitId,
      date: c.date,
      count: c.count,
      updated_at: now,
      deleted_at: null,
    }))
  );
  handleSyncResult('pushAllCompletions', error);
}

type RemoteHabitRow = {
  id: string;
  name: string;
  note: string | null;
  created_at: string;
  times: number;
  period_length: number;
  period_unit: string;
  sort_order: number;
  group_id: string | null;
  archive_runs: string | null;
  updated_at: string;
  deleted_at: string | null;
};

type RemoteGroupRow = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  updated_at: string;
  deleted_at: string | null;
};

type RemoteCompletionRow = {
  habit_id: string;
  date: string;
  count: number;
  updated_at: string;
  deleted_at: string | null;
};

/**
 * On sign-in: push all local rows to Supabase with their real updated_at timestamps,
 * using ignoreDuplicates so existing Supabase rows are never overwritten here.
 * Then pull to bring down anything newer or missing locally.
 * Net result: union of both sides, with remote winning on conflict.
 */
export async function syncOnSignIn(db: SQLiteDBConnection): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;

  // Read habits with their actual updated_at from SQLite
  const habitRows = await db.query(
    `SELECT id, name, note, createdAt, times, periodLength, periodUnit, groupId, sortOrder, updated_at, archive_runs
     FROM habits WHERE deleted_at IS NULL`
  );
  const remoteHabits: ReturnType<typeof toRemoteHabit>[] = [];
  for (const rawRow of habitRows.values ?? []) {
    const parseResult = SyncHabitRowSchema.safeParse(rawRow);
    if (!parseResult.success) {
      logger.warn('sync', 'Invalid habit row from SQLite, skipping', parseResult.error.issues);
      continue;
    }
    const row = parseResult.data;
    remoteHabits.push({
      id: row.id,
      user_id: user.id,
      name: row.name,
      note: row.note ?? null,
      created_at: row.createdAt,
      times: row.times,
      period_length: row.periodLength,
      period_unit: row.periodUnit,
      sort_order: row.sortOrder,
      group_id: row.groupId,
      archive_runs: row.archive_runs,
      updated_at: row.updated_at ?? new Date().toISOString(),
      deleted_at: null,
    });
  }

  if (remoteHabits.length > 0) {
    const { error } = await supabase
      .from('habits')
      .upsert(remoteHabits, { onConflict: 'id', ignoreDuplicates: true });
    handleSyncResult('syncOnSignIn habits', error);
  }

  // Push groups up
  const groupRows = await db.query(`SELECT id, name, sortOrder FROM habit_groups`);
  if (groupRows.values && groupRows.values.length > 0) {
    const rawGroups = z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          sortOrder: z.number(),
        })
      )
      .parse(groupRows.values);
    const remoteGroups = rawGroups.map(g =>
      toRemoteGroup(
        { id: g.id, name: g.name, sortOrder: g.sortOrder },
        user.id,
        new Date().toISOString()
      )
    );
    const { error } = await supabase
      .from('habit_groups')
      .upsert(remoteGroups, { onConflict: 'id', ignoreDuplicates: true });
    handleSyncResult('syncOnSignIn groups', error);
  }

  // Pull remote groups after push (gets remote group_id on habits)
  await pullAllGroups(db);

  // Read completions with their actual updated_at from SQLite
  const compRows = await db.query(`SELECT habitId, date, count, updated_at FROM completions`);
  const remoteCompletions: {
    user_id: string;
    habit_id: string;
    date: string;
    count: number;
    updated_at: string;
    deleted_at: null;
  }[] = [];
  for (const rawRow of compRows.values ?? []) {
    const parseResult = CompletionRowSchema.safeParse(rawRow);
    if (!parseResult.success) {
      logger.warn('sync', 'Invalid completion row from SQLite, skipping', parseResult.error.issues);
      continue;
    }
    const row = parseResult.data;
    remoteCompletions.push({
      user_id: user.id,
      habit_id: row.habitId,
      date: row.date,
      count: row.count,
      updated_at: row.updated_at ?? new Date().toISOString(),
      deleted_at: null,
    });
  }

  if (remoteCompletions.length > 0) {
    const { error } = await supabase
      .from('completions')
      .upsert(remoteCompletions, { onConflict: 'user_id,habit_id,date', ignoreDuplicates: true });
    handleSyncResult('syncOnSignIn completions', error);
  }

  await pullAll(db);
}

export async function pullAllGroups(db: SQLiteDBConnection): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;

  // --- Groups ---
  const { data: remoteGroups, error: groupsError } = await supabase
    .from('habit_groups')
    .select('*')
    .eq('user_id', user.id);
  if (groupsError) {
    logger.error('sync', 'pullAllGroups failed', groupsError.message);
    if (isSupabasePausedError(groupsError)) reportFailure();
    return;
  }

  for (const row of (remoteGroups ?? []) as RemoteGroupRow[]) {
    if (row.deleted_at) {
      await db.run(`DELETE FROM habit_groups WHERE id = ?`, [row.id]);
      continue;
    }
    await db.run(
      `INSERT INTO habit_groups (id, name, sortOrder) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, sortOrder = excluded.sortOrder`,
      [row.id, row.name, row.sort_order]
    );
  }
  reportSuccess();
}

/**
 * Pull all remote habits and completions, merge into local SQLite.
 * Remote wins if its updated_at is >= local. Soft-deleted remote rows are hard-deleted locally.
 * Notification settings are device-local and never overwritten by a pull.
 * Caller should reload from DB and update React state after this resolves.
 */
export async function pullAll(db: SQLiteDBConnection): Promise<void> {
  if (!shouldAttempt()) return;
  const user = await getUser();
  if (!user) return;

  await pullAllGroups(db);

  // --- Habits ---
  const { data: remoteHabits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id);
  if (habitsError) {
    logger.error('sync', 'pullAll habits failed', habitsError.message);
    if (isSupabasePausedError(habitsError)) reportFailure();
    return;
  }

  for (const row of (remoteHabits ?? []) as RemoteHabitRow[]) {
    if (row.deleted_at) {
      await db.run(`DELETE FROM habits WHERE id = ?`, [row.id]);
      continue;
    }
    const localResult = await db.query(`SELECT updated_at FROM habits WHERE id = ?`, [row.id]);
    const localUpdatedAt = (localResult.values?.[0] as { updated_at: string | null } | undefined)
      ?.updated_at;
    if (!localUpdatedAt || new Date(row.updated_at) >= new Date(localUpdatedAt)) {
      await db.run(
        `INSERT INTO habits (id, name, note, createdAt, times, periodLength, periodUnit, groupId, sortOrder, updated_at, archive_runs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, note = excluded.note, times = excluded.times,
           periodLength = excluded.periodLength, periodUnit = excluded.periodUnit,
           groupId = excluded.groupId, sortOrder = excluded.sortOrder,
           updated_at = excluded.updated_at, archive_runs = excluded.archive_runs`,
        [
          row.id,
          row.name,
          row.note ?? null,
          row.created_at,
          row.times,
          row.period_length,
          row.period_unit,
          row.group_id,
          row.sort_order,
          row.updated_at,
          row.archive_runs,
        ]
      );
    }
  }

  // --- Completions ---
  const { data: remoteCompletions, error: completionsError } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', user.id);
  if (completionsError) {
    logger.error('sync', 'pullAll completions failed', completionsError.message);
    if (isSupabasePausedError(completionsError)) reportFailure();
    return;
  }

  for (const row of (remoteCompletions ?? []) as RemoteCompletionRow[]) {
    if (row.deleted_at) {
      await db.run(`DELETE FROM completions WHERE habitId = ? AND date = ?`, [
        row.habit_id,
        row.date,
      ]);
      continue;
    }
    // Skip if the parent habit no longer exists locally (already cascade-deleted)
    const habitCheck = await db.query(`SELECT id FROM habits WHERE id = ?`, [row.habit_id]);
    if (!habitCheck.values?.length) continue;

    const localResult = await db.query(
      `SELECT updated_at FROM completions WHERE habitId = ? AND date = ?`,
      [row.habit_id, row.date]
    );
    const localUpdatedAt = (localResult.values?.[0] as { updated_at: string | null } | undefined)
      ?.updated_at;
    if (!localUpdatedAt || new Date(row.updated_at) >= new Date(localUpdatedAt)) {
      await db.run(
        `INSERT INTO completions (habitId, date, count, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(habitId, date) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at`,
        [row.habit_id, row.date, row.count, row.updated_at]
      );
    }
  }

  reportSuccess();
}
