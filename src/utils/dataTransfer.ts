import { z } from 'zod';

import { type Completion, CompletionSchema, type Habit, HabitSchema } from '../types';

const SCHEMA_VERSION = 1;

const ImportSchema = z.object({
  version: z.number().optional(),
  habits: z.array(HabitSchema),
  completions: z.array(CompletionSchema),
});

export type ImportResult =
  | { success: false; error: string }
  | { success: true; habits: Habit[]; completions: Completion[]; warning?: string };

// TODO: same `window as unknown as` double-cast anti-pattern as in utils.ts. Define a shared
// WindowWithCapacitor interface and use it in both files.
const platform =
  (window as unknown as { Capacitor?: { getPlatform: () => string } }).Capacitor?.getPlatform() ??
  'web';

export async function exportData(
  habits: Habit[],
  completions: Completion[]
): Promise<{ success: boolean; error?: string }> {
  try {
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
