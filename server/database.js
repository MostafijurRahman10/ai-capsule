import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function createDatabase(filename = process.env.DATABASE_PATH || './data/capsules.db') {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }

  const db = new DatabaseSync(filename);
  if (filename !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS capsules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      prompt_title TEXT NOT NULL,
      prompt_version TEXT,
      prompt_text TEXT NOT NULL,
      response_summary TEXT,
      category TEXT,
      usefulness TEXT,
      reviewed INTEGER NOT NULL DEFAULT 0 CHECK (reviewed IN (0, 1)),
      improved INTEGER NOT NULL DEFAULT 0 CHECK (improved IN (0, 1)),
      screenshot_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_capsules_user_id ON capsules(user_id);
  `);
  return db;
}
