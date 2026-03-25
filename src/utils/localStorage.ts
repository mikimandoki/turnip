import { z } from 'zod';

import { CompletionSchema, HabitSchema } from '../types';

const ImportSchema = z.object({
  habits: z.array(HabitSchema),
  completions: z.array(CompletionSchema),
});

export const HabitsSchema = z.array(HabitSchema);
export const CompletionsSchema = z.array(CompletionSchema);
export const HasOnboardedSchema = z.boolean();

export const APP_KEYS = ['habits', 'completions', 'hasOnboarded'] as const;

export function loadFromStorage<T>(key: string, fallback: T, schema: z.ZodType<T>): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return schema.parse(JSON.parse(stored));
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function clearStorage(): void {
  for (const key of APP_KEYS) {
    localStorage.removeItem(key);
  }
}

export function exportData(): { success: boolean; error?: string } {
  try {
    const data: Record<string, unknown> = {};
    for (const key of APP_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) {
        data[key] = JSON.parse(stored);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'turnip-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return { success: true };
  } catch {
    return { success: false, error: '[exportData] Failed to export data' };
  }
}

export function importData(json: string): { success: boolean; error?: string } {
  try {
    const raw: unknown = JSON.parse(json);
    const result = ImportSchema.safeParse(raw);
    if (!result.success) {
      return { success: false, error: '[importData] Invalid data format' };
    }
    saveToStorage('habits', result.data.habits);
    saveToStorage('completions', result.data.completions);
    return { success: true };
  } catch {
    return { success: false, error: '[importData] Failed to parse JSON' };
  }
}
