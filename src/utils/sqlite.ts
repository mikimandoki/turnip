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
 * Initialize DB if needed and return connection.
 * Only runs createConnection + open + createTable once.
 */
export async function getDB(): Promise<SQLiteDBConnection> {
  if (!dbPromise) {
    dbPromise = (async () => {
      if (!isNative) {
        // 1. Define the custom elements
        defineJeepSqlite(window);

        // 2. Look for the element
        const jeepEl = document.querySelector('jeep-sqlite');

        if (jeepEl) {
          // 3. Initialize the store (Crucial for web!)
          await sqlite.initWebStore();
          // 4. Wait for the component to be ready
          await jeepEl.componentOnReady();
        } else {
          throw new Error('jeep-sqlite element not found in DOM');
        }
      }

      let db: SQLiteDBConnection;
      try {
        db = await sqlite.createConnection('turnip', false, 'no-encryption', 1, false);
      } catch {
        // Connection already exists — retrieve it
        db = await sqlite.retrieveConnection('turnip', false);
      }

      await db.open();
      await db.execute(`PRAGMA foreign_keys = ON;`);

      await db.execute(
        `CREATE TABLE IF NOT EXISTS habits (
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
      `
      );
      await db.execute(
        `CREATE TABLE IF NOT EXISTS completions (
          habitId TEXT NOT NULL,
          date TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (habitId, date),
          FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
        );
      `
      );
      // One row per future occurrence — only used for windowed modes (interval, dom days 29–31).
      // Perpetual modes (daily, dow, dom days 1–28) use OS repeating notifications and need no queue.
      await db.execute(
        `CREATE TABLE IF NOT EXISTS notification_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habitId TEXT NOT NULL,
          scheduledAt TEXT NOT NULL,
          osNotificationId INTEGER NOT NULL,
          FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
        );`
      );
      return db;
    })().catch((e: unknown) => {
      dbPromise = null;
      throw e;
    });
  }

  return dbPromise;
}
