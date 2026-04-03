import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Toast } from '@capacitor/toast';

const sqlite = new SQLiteConnection(CapacitorSQLite);

export async function initDB(): Promise<SQLiteDBConnection> {
  const db = await sqlite.createConnection('turnip', false, 'no-encryption', 1, false);
  await db.open();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
    await Toast.show(
        {text: 'Hello, world!'}
    )
  return db;
}