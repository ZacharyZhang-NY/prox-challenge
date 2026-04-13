import initSqlJs, { type Database } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "sessions.db");
const WASM_PATH = path.join(
  process.cwd(),
  "node_modules",
  "sql.js",
  "dist",
  "sql-wasm.wasm"
);

let _db: Database | null = null;
let _initPromise: Promise<Database> | null = null;

function persist(db: Database) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function initDb(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: () => WASM_PATH,
  });

  let db: Database;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      messages TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  persist(db);

  return db;
}

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = initDb().then((db) => {
      _db = db;
      return db;
    });
  }
  return _initPromise;
}

export { persist };
