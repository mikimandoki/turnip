import { shareFile } from './share';
import { getDB } from './sqlite';

export type LogLevel = 'debug' | 'error' | 'info' | 'warn';

export interface LogEntry {
  id: number;
  level: LogLevel;
  tag: string;
  message: string;
  data: string | null;
  created_at: string;
}

const LOG_RETENTION_DAYS = 7;
const LOG_MAX_ENTRIES = 1000;

function serializeExtra(extra: unknown): string | null {
  if (extra === undefined) return null;
  if (extra instanceof Error) {
    return JSON.stringify({ name: extra.name, message: extra.message, stack: extra.stack });
  }
  // Strings are stored as-is — no extra JSON wrapping to avoid double-encoding
  if (typeof extra === 'string') return extra;
  try {
    return JSON.stringify(extra);
  } catch {
    return '[unserializable]';
  }
}

async function write(
  level: LogLevel,
  tag: string,
  message: string,
  extra?: unknown
): Promise<void> {
  if (import.meta.env.DEV) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (extra !== undefined) fn(`[${tag}] ${message}`, extra);
    else fn(`[${tag}] ${message}`);
  }

  try {
    const db = await getDB();
    await db.run(
      `INSERT INTO app_logs (level, tag, message, data, created_at) VALUES (?, ?, ?, ?, ?)`,
      [level, tag, message, serializeExtra(extra), new Date().toISOString()]
    );
  } catch (e) {
    if (import.meta.env.DEV) console.error('[logger] DB write failed:', e);
  }
}

export const logger = {
  debug: (tag: string, message: string, extra?: unknown) =>
    void write('debug', tag, message, extra),
  info: (tag: string, message: string, extra?: unknown) => void write('info', tag, message, extra),
  warn: (tag: string, message: string, extra?: unknown) => void write('warn', tag, message, extra),
  error: (tag: string, message: string, extra?: unknown) =>
    void write('error', tag, message, extra),
};

/** Delete entries older than LOG_RETENTION_DAYS and cap table at LOG_MAX_ENTRIES. */
export async function pruneLogs(): Promise<void> {
  try {
    const db = await getDB();
    const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await db.run(`DELETE FROM app_logs WHERE created_at < ?`, [cutoff]);
    await db.run(
      `DELETE FROM app_logs WHERE id NOT IN (SELECT id FROM app_logs ORDER BY created_at DESC LIMIT ?)`,
      [LOG_MAX_ENTRIES]
    );
  } catch {
    // Ignore
  }
}

export async function getLogs(limit = 500): Promise<LogEntry[]> {
  try {
    const db = await getDB();
    const result = await db.query(
      `SELECT id, level, tag, message, data, created_at FROM app_logs ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return (result.values ?? []) as LogEntry[];
  } catch {
    return [];
  }
}

export async function getLogCount(): Promise<number> {
  try {
    const db = await getDB();
    const result = await db.query(`SELECT COUNT(*) as count FROM app_logs`);
    return (result.values?.[0] as { count: number } | undefined)?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function clearAllLogs(): Promise<void> {
  try {
    const db = await getDB();
    await db.run(`DELETE FROM app_logs`);
  } catch {
    // Ignore
  }
}

/** Format logs as a plain text file, one entry per line with optional indented data block. */
export async function exportLogs(): Promise<string> {
  const logs = await getLogs(LOG_MAX_ENTRIES);
  // Logs are newest-first from the DB; reverse so the file reads oldest-first
  const lines = [...logs].reverse().map(({ level, tag, message, data, created_at }) => {
    const header = `${created_at} ${level.toUpperCase().padEnd(5)} [${tag}] ${message}`;
    if (!data) return header;
    // Inline compact JSON; fall back to raw string if not valid JSON
    try {
      return `${header} ${JSON.stringify(JSON.parse(data))}`;
    } catch {
      return `${header} ${data}`;
    }
  });
  return lines.join('\n') + '\n';
}

/** Download / share the log file. */
export async function exportLogsToFile(): Promise<{ success: boolean; error?: string }> {
  const text = await exportLogs();
  const filename = `turnip-logs-${new Date().toISOString().slice(0, 10)}.log`;
  return shareFile(text, filename, 'text/plain', 'Turnip Logs');
}
