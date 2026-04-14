import { z } from 'zod';

import { type Completion, CompletionSchema, type Habit, HabitSchema } from '../types';
import { shareFile } from './share';

const SCHEMA_VERSION = 1;

const ImportSchema = z.object({
  version: z.number().optional(),
  habits: z.array(HabitSchema),
  completions: z.array(CompletionSchema),
});

export type ImportResult =
  | { success: false; error: string }
  | { success: true; habits: Habit[]; completions: Completion[]; warning?: string };

export async function exportData(
  habits: Habit[],
  completions: Completion[]
): Promise<{ success: boolean; error?: string }> {
  const json = JSON.stringify({ version: SCHEMA_VERSION, habits, completions }, null, 2);
  return shareFile(json, 'turnip-backup.json', 'application/json', 'Turnip Backup');
}

/** Parses and validates a JSON backup string. Does not write to any storage. */
export function importData(json: string): ImportResult {
  try {
    const raw: unknown = JSON.parse(json);
    const result = ImportSchema.safeParse(raw);
    if (!result.success) return { success: false, error: 'Invalid data format' };
    return { success: true, habits: result.data.habits, completions: result.data.completions };
  } catch {
    return { success: false, error: 'Failed to parse JSON' };
  }
}
