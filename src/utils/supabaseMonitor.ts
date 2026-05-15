const BACKOFF_STEPS = [15_000, 30_000, 60_000, 120_000];

export type SyncStatus = 'available' | 'unavailable';

let status: SyncStatus = 'available';
let step = 0;
let nextAttemptAt = 0;
let listeners: Array<(status: SyncStatus) => void> = [];

export function shouldAttempt(): boolean {
  if (status === 'available') return true;
  return Date.now() >= nextAttemptAt;
}

export function reportSuccess(): void {
  if (status !== 'available') {
    status = 'available';
    step = 0;
    nextAttemptAt = 0;
    notify();
  }
}

export function reportFailure(): void {
  if (status === 'available') {
    status = 'unavailable';
    notify();
  }
  const idx = Math.min(step, BACKOFF_STEPS.length - 1);
  nextAttemptAt = Date.now() + BACKOFF_STEPS[idx];
  step = Math.min(step + 1, BACKOFF_STEPS.length);
}

export function isSupabasePausedError(error: unknown): boolean {
  if (!error) return false;
  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (error instanceof Error) {
    msg = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const val = (error as Record<string, unknown>).message;
    msg = typeof val === 'string' ? val : '';
  }
  const lower = msg.toLowerCase();
  return (
    lower.includes('paused') ||
    lower.includes('deactivated') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('recovery mode') ||
    lower.includes('service unavailable')
  );
}

export function onStatusChange(fn: (s: SyncStatus) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(f => f !== fn);
  };
}

function notify(): void {
  for (const fn of listeners) fn(status);
}
