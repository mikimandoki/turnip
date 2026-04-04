import { Preferences } from '@capacitor/preferences';
import { z } from 'zod';

export const HasOnboardedSchema = z.boolean();

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
    // TODO: this catch conflates three different cases: key not found (expected), JSON parse
    // error (data corruption), and permission/platform error. Log unexpected errors so they're
    // not silently swallowed as if the key was simply missing.
    return fallback;
  }
}

export async function saveToStorage<T>(key: string, data: T): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(data) });
}

export async function clearStorage(): Promise<void> {
  await Promise.all([
    Preferences.remove({ key: 'hasOnboarded' }),
    Preferences.remove({ key: 'darkMode' }),
  ]);
}
