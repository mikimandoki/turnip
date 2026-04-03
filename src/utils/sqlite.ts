import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';

import { isNative } from './utils';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let dbPromise: Promise<SQLiteDBConnection> | null = null;

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
const CURRENT_VERSION = 1;

async function runMigrations(db: SQLiteDBConnection): Promise<void> {
  const versionResult = await db.query(`PRAGMA user_version`);
  const currentVersion =
    (versionResult.values?.[0] as { user_version: number } | undefined)?.user_version ?? 0;

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

  // Future versions go here:
  // if (currentVersion < 2) { ... await db.run(`PRAGMA user_version = 2`); }
}

/**
 * Initialize DB if needed and return connection.
 * Only runs setup once per app session.
 */
export async function getDB(): Promise<SQLiteDBConnection> {
  if (!dbPromise) {
    dbPromise = (async () => {
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
      } catch {
        db = await sqlite.retrieveConnection('turnip', false);
      }

      await db.open();
      // foreign_keys is connection-scoped — must be set every open
      await db.execute(`PRAGMA foreign_keys = ON;`);
      await runMigrations(db);

      return db;
    })().catch((e: unknown) => {
      dbPromise = null;
      throw e;
    });
  }

  return dbPromise;
}
