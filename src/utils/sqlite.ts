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
      } catch (e) {
        // If connection exists, retrieve it
        db = await sqlite.retrieveConnection('turnip', false);
        console.log(e);
      }

      await db.open();

      await db.execute(
        `CREATE TABLE IF NOT EXISTS habits (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          times INTEGER NOT NULL DEFAULT 1,
          periodLength INTEGER NOT NULL DEFAULT 1,
          periodUnit TEXT NOT NULL DEFAULT 'day',
          sortOrder INTEGER NOT NULL DEFAULT 0
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
      await db.execute(
        `CREATE TABLE IF NOT EXISTS habit_notifications (
          habitId TEXT PRIMARY KEY NOT NULL,
          enabled INTEGER DEFAULT 1,
          mode TEXT NOT NULL,                -- 'daily', 'days-of-week', 'days-of-month', 'interval'
          time TEXT NOT NULL,                -- 'HH:mm'
          days TEXT,                         -- JSON string of number[] (days of week)
          monthDays TEXT,                    -- JSON string of number[] (days of month)
          customMessage TEXT,
          notificationIds TEXT,              -- JSON string of number[] (OS IDs)
          lastScheduledAt TEXT,              -- ISO string of the furthest scheduled date
          intervalN INTEGER,                 -- For 'interval' mode
          intervalUnit TEXT,                 -- 'days' or 'weeks'
          FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
        );`
      );
      return db;
    })();
  }

  return dbPromise;
}
