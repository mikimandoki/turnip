import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let dbPromise: Promise<SQLiteDBConnection> | null = null;

/**
 * Initialize DB if needed and return connection.
 * Only runs createConnection + open + createTable once.
 */
export async function getDB(): Promise<SQLiteDBConnection> {
  if (!dbPromise) {
    dbPromise = (async () => {
      let db: SQLiteDBConnection;

      try {
        db = await sqlite.createConnection('turnip', false, 'no-encryption', 1, false);
      } catch {
        // connection already exists in memory
        db = await sqlite.retrieveConnection('turnip', false);
      }

      await db.open();

      await db.execute(`
        CREATE TABLE IF NOT EXISTS habits (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          times INTEGER NOT NULL DEFAULT 1,
          periodLength INTEGER NOT NULL DEFAULT 1,
          periodUnit TEXT NOT NULL DEFAULT 'day'
        );
      `);
      return db;
    })();
  }

  return dbPromise;
}
