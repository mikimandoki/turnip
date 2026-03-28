/**
 * NOTE: Capacitor discourages the usage of the Preferences API for local storage
 * However the data modal is so small that using SQLite et al. is overkill
 */
import { Preferences } from '@capacitor/preferences';
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

export async function loadFromStorage<T>(
  key: string,
  fallback: T,
  schema: z.ZodType<T>
): Promise<T> {
  try {
    const { value } = await Preferences.get({ key });
    if (!value) return fallback;
    return schema.parse(JSON.parse(value));
  } catch {
    return fallback;
  }
}

export async function saveToStorage<T>(key: string, data: T): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(data) });
}

export async function clearStorage(): Promise<void> {
  await Promise.all(APP_KEYS.map(key => Preferences.remove({ key })));
}

export async function exportData(): Promise<{ success: boolean; error?: string }> {
  try {
    const [habits, completions] = await Promise.all([
      loadFromStorage('habits', [], HabitsSchema),
      loadFromStorage('completions', [], CompletionsSchema),
    ]);
    const json = JSON.stringify({ version: SCHEMA_VERSION, habits, completions }, null, 2);

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

export async function importData(json: string): Promise<ImportResult> {
  try {
    const raw: unknown = JSON.parse(json);
    const result = ImportSchema.safeParse(raw);
    if (!result.success) {
      return { success: false, error: '[importData] Invalid data format' };
    }
    await Promise.all([
      saveToStorage('habits', result.data.habits),
      saveToStorage('completions', result.data.completions),
    ]);
    return { success: true, habits: result.data.habits, completions: result.data.completions };
  } catch {
    return { success: false, error: '[importData] Failed to parse JSON' };
  }
}
