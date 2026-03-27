import { z } from 'zod';

import { type Completion, CompletionSchema, type Habit, HabitSchema } from '../types';

const platform =
  (window as unknown as { Capacitor?: { getPlatform: () => string } }).Capacitor?.getPlatform() ??
  'web';

const SCHEMA_VERSION = 1;

const ImportSchema = z.object({
  version: z.number().optional(),
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

export async function exportData(): Promise<{ success: boolean; error?: string }> {
  try {
    const data: Record<string, unknown> = {};
    for (const key of APP_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) {
        data[key] = JSON.parse(stored);
      }
    }
    const json = JSON.stringify({ version: SCHEMA_VERSION, ...data }, null, 2);

    if (platform === 'ios') {
      const file = new File([json], 'turnip-backup.json', { type: 'application/json' });
      await navigator.share({ files: [file] });
    } else if (platform === 'android') {
      const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      await Filesystem.writeFile({
        path: 'turnip-backup.json',
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      const { uri } = await Filesystem.getUri({
        path: 'turnip-backup.json',
        directory: Directory.Cache,
      });
      await Share.share({ title: 'Turnip Backup', url: uri });
    } else {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'turnip-backup.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    return { success: true };
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || e.message === 'Share canceled'))
      return { success: true };
    return { success: false, error: '[exportData] Failed to export data' };
  }
}

export type ImportResult =
  | { success: false; error: string }
  | { success: true; habits: Habit[]; completions: Completion[] };

export function importData(json: string): ImportResult {
  try {
    const raw: unknown = JSON.parse(json);
    const result = ImportSchema.safeParse(raw);
    if (!result.success) {
      return { success: false, error: '[importData] Invalid data format' };
    }
    saveToStorage('habits', result.data.habits);
    saveToStorage('completions', result.data.completions);
    return { success: true, habits: result.data.habits, completions: result.data.completions };
  } catch {
    return { success: false, error: '[importData] Failed to parse JSON' };
  }
}
