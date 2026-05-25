/**
 * Singleton SQLite connection used at runtime by the API routes and AI tools.
 *
 * The actual schema and data come from the seed script:
 *   `npm run seed` (web/scripts/seed-gtfs.ts)
 *
 * This module is intentionally tiny — it just opens the DB file and applies
 * the runtime PRAGMAs. All query logic lives in `web/lib/gtfs/queries.ts`
 * (added in a later step).
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

let _db: Database.Database | null = null;

/** Default DB path. Override with TRANSIT_DB env var if you want to point
 *  somewhere else (e.g. a generated file in /tmp on a serverless platform). */
const DEFAULT_PATH = path.join(process.cwd(), "transit.db");

export function dbPath(): string {
  return process.env.TRANSIT_DB || DEFAULT_PATH;
}

/**
 * Open (or return the cached) connection. Safe to call from multiple
 * route handlers — better-sqlite3 connections are reusable across
 * requests in a Next.js process.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const file = dbPath();
  if (!fs.existsSync(file)) {
    throw new Error(
      `transit.db not found at ${file}. Run "npm run seed" first to build it from web/data/google-transit.zip.`
    );
  }

  const db = new Database(file, { readonly: false, fileMustExist: true });

  // Runtime PRAGMAs — durability + integrity, not throughput.
  db.pragma("journal_mode = WAL");      // concurrent reads while another writer is active
  db.pragma("synchronous = NORMAL");    // safe enough for a derived feed file
  db.pragma("foreign_keys = ON");
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = -16000");     // 16 MB page cache

  _db = db;
  return _db;
}

/** Manually close the connection (mainly for the seed script). */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
