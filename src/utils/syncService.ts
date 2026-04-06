import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

import type { Completion, Habit } from '../types';

import { supabase } from './supabase';

async function getUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export function toRemoteHabit(habit: Habit, userId: string, sortOrder: number, now: string) {
  return {
    id: habit.id,
    user_id: userId,
    name: habit.name,
    created_at: habit.createdAt,
    times: habit.frequency.times,
    period_length: habit.frequency.periodLength,
    period_unit: habit.frequency.periodUnit,
    sort_order: sortOrder,
    updated_at: now,
    deleted_at: null,
  };
}

export async function pushHabit(habit: Habit, sortOrder: number): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const { error } = await supabase
    .from('habits')
    .upsert(toRemoteHabit(habit, user.id, sortOrder, new Date().toISOString()));
  if (error) console.error('[sync] pushHabit failed:', error.message);
}

export async function softDeleteHabit(habitId: string): Promise<void> {
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
  if (habitRes.error) console.error('[sync] softDeleteHabit failed:', habitRes.error.message);
  if (compRes.error)
    console.error('[sync] softDeleteHabit completions failed:', compRes.error.message);
}

export async function deleteSupabaseAccount(): Promise<{ error?: string }> {
  const { error } = (await supabase.functions.invoke('delete-account')) as { error: unknown };
  if (error) return { error: error instanceof Error ? error.message : 'Failed to delete account' };
  return {};
}

export async function softDeleteAllHabits(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const { error } = await supabase
    .from('habits')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('deleted_at', null);
  if (error) console.error('[sync] softDeleteAllHabits failed:', error.message);
}

export async function pushAllHabits(habits: Habit[]): Promise<void> {
  const user = await getUser();
  if (!user || habits.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('habits')
    .upsert(habits.map((h, i) => toRemoteHabit(h, user.id, i, now)));
  if (error) console.error('[sync] pushAllHabits failed:', error.message);
}

export async function pushCompletion(habitId: string, date: string, count: number): Promise<void> {
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
  if (error) console.error('[sync] pushCompletion failed:', error.message);
}

export async function softDeleteCompletion(habitId: string, date: string): Promise<void> {
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
  if (error) console.error('[sync] softDeleteCompletion failed:', error.message);
}

export async function pushAllCompletions(completions: Completion[]): Promise<void> {
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
  if (error) console.error('[sync] pushAllCompletions failed:', error.message);
}

type RemoteHabitRow = {
  id: string;
  name: string;
  created_at: string;
  times: number;
  period_length: number;
  period_unit: string;
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
  const user = await getUser();
  if (!user) return;

  // Read habits with their actual updated_at from SQLite
  const habitRows = await db.query(
    `SELECT id, name, createdAt, times, periodLength, periodUnit, sortOrder, updated_at
     FROM habits WHERE deleted_at IS NULL`
  );
  // TODO: these `as string` / `as number` casts on Record<string, unknown> are unsafe. If the
  // SQLite column names or types drift, this silently produces garbage. Replace with a Zod schema
  // that validates the raw row shape before mapping, the same way loadDataFromDB does.
  const remoteHabits = (habitRows.values ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    user_id: user.id,
    name: row.name as string,
    created_at: row.createdAt as string,
    times: row.times as number,
    period_length: row.periodLength as number,
    period_unit: row.periodUnit as string,
    sort_order: row.sortOrder as number,
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
    deleted_at: null,
  }));

  if (remoteHabits.length > 0) {
    const { error } = await supabase
      .from('habits')
      .upsert(remoteHabits, { onConflict: 'id', ignoreDuplicates: true });
    if (error) console.error('[sync] syncOnSignIn habits failed:', error.message);
  }

  // Read completions with their actual updated_at from SQLite
  const compRows = await db.query(`SELECT habitId, date, count, updated_at FROM completions`);
  const remoteCompletions = (compRows.values ?? []).map((row: Record<string, unknown>) => ({
    user_id: user.id,
    habit_id: row.habitId as string,
    date: row.date as string,
    count: row.count as number,
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
    deleted_at: null,
  }));

  if (remoteCompletions.length > 0) {
    const { error } = await supabase
      .from('completions')
      .upsert(remoteCompletions, { onConflict: 'user_id,habit_id,date', ignoreDuplicates: true });
    if (error) console.error('[sync] syncOnSignIn completions failed:', error.message);
  }

  await pullAll(db);
}

/**
 * Pull all remote habits and completions, merge into local SQLite.
 * Remote wins if its updated_at is >= local. Soft-deleted remote rows are hard-deleted locally.
 * Notification settings are device-local and never overwritten by a pull.
 * Caller should reload from DB and update React state after this resolves.
 */
export async function pullAll(db: SQLiteDBConnection): Promise<void> {
  const user = await getUser();
  if (!user) return;

  // --- Habits ---
  const { data: remoteHabits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id);
  if (habitsError) {
    console.error('[sync] pullAll habits failed:', habitsError.message);
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
        `INSERT INTO habits (id, name, createdAt, times, periodLength, periodUnit, sortOrder, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, times = excluded.times, periodLength = excluded.periodLength,
           periodUnit = excluded.periodUnit, sortOrder = excluded.sortOrder,
           updated_at = excluded.updated_at`,
        [
          row.id,
          row.name,
          row.created_at,
          row.times,
          row.period_length,
          row.period_unit,
          row.sort_order,
          row.updated_at,
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
    console.error('[sync] pullAll completions failed:', completionsError.message);
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
}
