import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';

import { isNative } from './utils';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let dbPromise: Promise<SQLiteDBConnection> | null = null;

// Buffers [db] logs before DB is ready, flushed via flushDbLogs() once init completes.
const dbLogBuffer: string[] = [];
function dbLog(msg: string): void {
  console.log('[db]', msg);
  dbLogBuffer.push(msg);
}
export async function flushDbLogs(): Promise<void> {
  if (dbLogBuffer.length === 0) return;
  const { logger } = await import('./logger');
  for (const msg of dbLogBuffer) {
    try {
      logger.info('db', msg);
    } catch {
      /* best-effort */
    }
  }
  dbLogBuffer.length = 0;
}

/**
 * Syncs the in-memory web DB to IndexedDB.
 * No-op on native iOS/Android.
 */
export async function syncDB() {
  if (!isNative) {
    await sqlite.saveToStore('turnip');
  }
}

/**
 * Additive schema migrations keyed by version number.
 * Rules:
 *   - Never DROP or rename existing columns/tables.
 *   - Each version block must be idempotent (CREATE IF NOT EXISTS, column existence checks).
 *   - Bump CURRENT_VERSION when adding a new block.
 */
const CURRENT_VERSION = 8;

async function writeMigrationLog(
  db: SQLiteDBConnection,
  level: string,
  tag: string,
  message: string
): Promise<void> {
  try {
    await db.run(
      `INSERT INTO app_logs (level, tag, message, data, created_at) VALUES (?, ?, ?, ?, ?)`,
      [level, tag, message, null, new Date().toISOString()]
    );
  } catch {
    // Migration logger is best-effort — don't let logging failures break the migration.
  }
}

async function runMigrations(db: SQLiteDBConnection): Promise<void> {
  const versionResult = await db.query(`PRAGMA user_version`);
  const currentVersion =
    (versionResult.values?.[0] as { user_version: number } | undefined)?.user_version ?? 0;

  try {
    if (currentVersion < CURRENT_VERSION) {
      // Create core tables (no-op if they already exist)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS habits (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          times INTEGER NOT NULL DEFAULT 1,
          periodLength INTEGER NOT NULL DEFAULT 1,
          periodUnit TEXT NOT NULL DEFAULT 'day',
          sortOrder INTEGER NOT NULL DEFAULT 0,
          notif_enabled INTEGER DEFAULT 0,
          notif_mode TEXT,
          notif_time TEXT,
          notif_days TEXT,
          notif_monthDays TEXT,
          notif_customMessage TEXT,
          notif_intervalN INTEGER,
          notif_intervalUnit TEXT
        );
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS completions (
          habitId TEXT NOT NULL,
          date TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (habitId, date),
          FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
        );
      `);
      // UNIQUE(habitId, scheduledAt) guards against double top-up inserts.
      await db.execute(`
        CREATE TABLE IF NOT EXISTS notification_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habitId TEXT NOT NULL,
          scheduledAt TEXT NOT NULL,
          osNotificationId INTEGER NOT NULL,
          UNIQUE(habitId, scheduledAt),
          FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
        );
      `);

      // Additive column additions for installs that pre-date this migration.
      // ALTER TABLE … ADD COLUMN has no IF NOT EXISTS — check manually.
      const colResult = await db.query(`PRAGMA table_info(habits)`);
      const existingCols = new Set((colResult.values ?? []).map((r: { name: string }) => r.name));
      const additions: [string, string][] = [
        ['sortOrder', 'INTEGER NOT NULL DEFAULT 0'],
        ['notif_enabled', 'INTEGER DEFAULT 0'],
        ['notif_mode', 'TEXT'],
        ['notif_time', 'TEXT'],
        ['notif_days', 'TEXT'],
        ['notif_monthDays', 'TEXT'],
        ['notif_customMessage', 'TEXT'],
        ['notif_intervalN', 'INTEGER'],
        ['notif_intervalUnit', 'TEXT'],
      ];
      for (const [col, def] of additions) {
        if (!existingCols.has(col)) {
          await db.execute(`ALTER TABLE habits ADD COLUMN ${col} ${def}`);
        }
      }

      await db.run(`PRAGMA user_version = 1`);
    }

    if (currentVersion < 2) {
      await writeMigrationLog(
        db,
        'info',
        'db',
        'Migration v2: adding updated_at / deleted_at columns'
      );
      // Add updated_at and deleted_at for sync conflict resolution.
      const h2 = await db.query(`PRAGMA table_info(habits)`);
      const hCols = new Set((h2.values ?? []).map((r: { name: string }) => r.name));
      if (!hCols.has('updated_at')) {
        await db.execute(`ALTER TABLE habits ADD COLUMN updated_at TEXT`);
        await db.execute(`UPDATE habits SET updated_at = createdAt WHERE updated_at IS NULL`);
      }
      if (!hCols.has('deleted_at')) {
        await db.execute(`ALTER TABLE habits ADD COLUMN deleted_at TEXT`);
      }

      const c2 = await db.query(`PRAGMA table_info(completions)`);
      const cCols = new Set((c2.values ?? []).map((r: { name: string }) => r.name));
      if (!cCols.has('updated_at')) {
        await db.execute(`ALTER TABLE completions ADD COLUMN updated_at TEXT`);
        await db.execute(`UPDATE completions SET updated_at = date WHERE updated_at IS NULL`);
      }

      await db.run(`PRAGMA user_version = 2`);
    }

    if (currentVersion < 3) {
      await writeMigrationLog(db, 'info', 'db', 'Migration v3: creating app_logs table');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS app_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT NOT NULL,
          tag TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          created_at TEXT NOT NULL
        );
      `);
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs (created_at);`
      );
      await db.run(`PRAGMA user_version = 3`);
    }

    if (currentVersion < 4) {
      await writeMigrationLog(db, 'info', 'db', 'Migration v4: adding note column');
      const h4 = await db.query(`PRAGMA table_info(habits)`);
      const hCols4 = new Set((h4.values ?? []).map((r: { name: string }) => r.name));
      if (!hCols4.has('note')) {
        await db.execute(`ALTER TABLE habits ADD COLUMN note TEXT`);
      }
      await db.run(`PRAGMA user_version = 4`);
    }

    if (currentVersion < 5) {
      await writeMigrationLog(db, 'info', 'db', 'Migration v5: creating habit_groups table');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS habit_groups (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          sortOrder INTEGER NOT NULL DEFAULT 0
        );
      `);
      const h5 = await db.query(`PRAGMA table_info(habits)`);
      const hCols5 = new Set((h5.values ?? []).map((r: { name: string }) => r.name));
      if (!hCols5.has('groupId')) {
        await db.execute(`ALTER TABLE habits ADD COLUMN groupId TEXT REFERENCES habit_groups(id)`);
      }
      await db.run(`PRAGMA user_version = 5`);
    }

    if (currentVersion < 6) {
      await writeMigrationLog(db, 'info', 'db', 'Migration v6: adding archive_runs column');
      const h6 = await db.query(`PRAGMA table_info(habits)`);
      const hCols6 = new Set((h6.values ?? []).map((r: { name: string }) => r.name));
      if (!hCols6.has('archive_runs')) {
        await db.execute(`ALTER TABLE habits ADD COLUMN archive_runs TEXT`);
        await db.execute(`UPDATE habits SET archive_runs = '[]' WHERE archive_runs IS NULL`);
      }
      await db.execute(`PRAGMA user_version = 6`);
    }

    if (currentVersion < 7) {
      await writeMigrationLog(db, 'info', 'db', 'Migration v7: adding startDate column');
      const h7 = await db.query(`PRAGMA table_info(habits)`);
      const hCols7 = new Set((h7.values ?? []).map((r: { name: string }) => r.name));
      if (!hCols7.has('startDate')) {
        await db.execute(`ALTER TABLE habits ADD COLUMN startDate TEXT`);
        await db.execute(`UPDATE habits SET startDate = createdAt WHERE startDate IS NULL`);
      }
      await db.execute(`PRAGMA user_version = 7`);
    }

    if (currentVersion < 8) {
      await writeMigrationLog(db, 'info', 'db', 'Migration v8: adding flexible_period column');
      const h8 = await db.query(`PRAGMA table_info(habits)`);
      const hCols8 = new Set((h8.values ?? []).map((r: { name: string }) => r.name));
      if (!hCols8.has('flexible_period')) {
        await db.execute(
          `ALTER TABLE habits ADD COLUMN flexible_period INTEGER NOT NULL DEFAULT 0`
        );
      }
      await db.execute(`PRAGMA user_version = 8`);
    }

    await writeMigrationLog(db, 'info', 'db', `Migration complete (v${CURRENT_VERSION})`);
  } catch (e) {
    await writeMigrationLog(
      db,
      'error',
      'db',
      `Migration failed: ${e instanceof Error ? e.message : String(e)}`
    );
    throw e;
  }

  // Post-migration consistency: verify all expected columns actually exist.
  // Handles cases where PRAGMA was bumped but ALTER TABLE silently failed.
  const expectedCols: [string, string][] = [
    ['archive_runs', 'TEXT'],
    ['startDate', 'TEXT'],
  ];
  const postCheck = await db.query(`PRAGMA table_info(habits)`);
  const postCols = new Set((postCheck.values ?? []).map((r: { name: string }) => r.name));
  for (const [col, def] of expectedCols) {
    if (!postCols.has(col)) {
      await db.run(`ALTER TABLE habits ADD COLUMN ${col} ${def}`, []);
    }
  }
}

/**
 * Initialize DB if needed and return connection.
 * Only runs setup once per app session.
 */
async function initDB(): Promise<SQLiteDBConnection> {
  if (!isNative) {
    defineJeepSqlite(window);
    const jeepEl = document.querySelector('jeep-sqlite');
    if (jeepEl) {
      await sqlite.initWebStore();
      await jeepEl.componentOnReady();
    } else {
      throw new Error('jeep-sqlite element not found in DOM');
    }
  }

  let db: SQLiteDBConnection;
  try {
    db = await sqlite.createConnection('turnip', false, 'no-encryption', 1, false);
    dbLog('initDB: created new connection');
  } catch {
    db = await sqlite.retrieveConnection('turnip', false);
    dbLog('initDB: retrieved existing connection');
  }

  await db.open();
  await db.execute(`PRAGMA foreign_keys = ON;`);
  await runMigrations(db);

  void flushDbLogs();

  return db;
}

export async function getDB(): Promise<SQLiteDBConnection> {
  if (!dbPromise) {
    dbLog('getDB: cache miss — initializing');
    dbPromise = initDB().catch((e: unknown) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}
/** Close and reinitialize the DB connection (e.g. after OS killed it). */
export async function reopenDB(): Promise<SQLiteDBConnection> {
  dbLog('reopenDB: forcing new connection');
  dbPromise = null;
  const db = await initDB();
  dbPromise = Promise.resolve(db);
  return db;
}
