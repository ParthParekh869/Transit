/**
 * Build web/transit.db from web/data/google-transit.zip.
 *
 * Usage:   npm run seed
 *
 * Idempotent — every CREATE in schema.sql is paired with DROP IF EXISTS,
 * so re-running this overwrites the previous import cleanly.
 *
 * What it does, in order:
 *   1. Open a fresh DB at web/transit.db
 *   2. Apply the schema (drops + recreates every table)
 *   3. Open the GTFS zip and stream-parse each CSV in turn
 *   4. Insert each table inside one big transaction (orders of magnitude
 *      faster than auto-commit; better-sqlite3 prepared statements with
 *      `db.transaction()` are the right pattern here)
 *   5. Build the materialized denormalizations (route_stops, route_directions,
 *      stop_routes) at the end with derived SQL — these power the UI's
 *      most common queries
 *   6. Print row counts as a sanity check
 *
 * Performance: ~3-5s on a modern laptop. The 463K-row stop_times import
 * is the slow part; everything else is sub-second.
 */

import path from "node:path";
import fs from "node:fs";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import Database from "better-sqlite3";

const ROOT = path.resolve(__dirname, "..");
const ZIP_PATH = path.join(ROOT, "data", "google-transit.zip");
const DB_PATH = process.env.TRANSIT_DB || path.join(ROOT, "transit.db");
const SCHEMA_PATH = path.join(ROOT, "lib", "gtfs", "schema.sql");

// ============================================================
// Helpers
// ============================================================

/** Read a single CSV entry from the zip and parse it into rows.
 *  Uses the synchronous csv-parse — these files all fit in RAM
 *  comfortably and the seed runs once per import, not per request. */
function readCsv<T = Record<string, string>>(zip: AdmZip, name: string): T[] {
  const entry = zip.getEntry(name);
  if (!entry) throw new Error(`Missing GTFS file in zip: ${name}`);
  const buf = entry.getData();
  return parse(buf, {
    columns: true,
    bom: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

/** Coerce GTFS empty strings to null and "1"/"0" to integers as appropriate. */
const intOrNull = (v: string | undefined | null): number | null =>
  v == null || v === "" ? null : Number(v);
const strOrNull = (v: string | undefined | null): string | null =>
  v == null || v === "" ? null : v;

/** Strip "#" prefix from a hex color if present. GTFS spec says no #,
 *  but we've seen feeds include it inconsistently. */
function normalizeColor(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = v.trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(s) ? s : null;
}

/** Pretty-print a row count for the stats summary. */
const fmt = (n: number) => n.toLocaleString("en-US");

// ============================================================
// Main
// ============================================================

function main() {
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(
      `GTFS zip not found at ${ZIP_PATH}. Place the feed there and re-run.`
    );
  }
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`schema.sql not found at ${SCHEMA_PATH}.`);
  }

  // Remove the previous DB file so seed PRAGMAs apply to a fresh page cache.
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  if (fs.existsSync(DB_PATH + "-wal")) fs.unlinkSync(DB_PATH + "-wal");
  if (fs.existsSync(DB_PATH + "-shm")) fs.unlinkSync(DB_PATH + "-shm");

  const db = new Database(DB_PATH);

  // Seed-only PRAGMAs — durability traded for throughput.
  db.pragma("journal_mode = OFF");      // we'll switch to WAL on next open
  db.pragma("synchronous = OFF");
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = -65536");     // 64 MB cache

  console.log(`→ Applying schema...`);
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

  console.log(`→ Reading ${path.relative(process.cwd(), ZIP_PATH)} (${(fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(1)} MB)`);
  const zip = new AdmZip(ZIP_PATH);

  // ----- feed_info + agency -----
  console.log(`→ Importing feed_info, agencies...`);
  const feedInfo = readCsv(zip, "feed_info.txt");
  if (feedInfo.length > 0) {
    const fi = feedInfo[0];
    db.prepare(
      `INSERT INTO feed_meta (publisher, publisher_url, lang, contact_email, start_date, end_date, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      fi.feed_publisher_name ?? null,
      fi.feed_publisher_url ?? null,
      fi.feed_lang ?? null,
      fi.feed_contact_email ?? null,
      fi.feed_start_date ?? null,
      fi.feed_end_date ?? null,
      Math.floor(Date.now() / 1000)
    );
  }

  const agencies = readCsv(zip, "agency.txt");
  const insertAgency = db.prepare(
    `INSERT INTO agencies (agency_id, name, url, timezone, lang, phone)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const a of agencies) {
      insertAgency.run(
        a.agency_id ?? "",
        a.agency_name,
        strOrNull(a.agency_url),
        strOrNull(a.agency_timezone),
        strOrNull(a.agency_lang),
        strOrNull(a.agency_phone)
      );
    }
  })();

  // ----- routes -----
  console.log(`→ Importing routes...`);
  const routes = readCsv(zip, "routes.txt");
  const insertRoute = db.prepare(
    `INSERT INTO routes (route_id, short_name, long_name, type, url, color, text_color, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const r of routes) {
      insertRoute.run(
        r.route_id,
        strOrNull(r.route_short_name),
        strOrNull(r.route_long_name),
        intOrNull(r.route_type),
        strOrNull(r.route_url),
        normalizeColor(r.route_color),
        normalizeColor(r.route_text_color),
        intOrNull(r.route_sort_order)
      );
    }
  })();

  // ----- stops -----
  console.log(`→ Importing stops...`);
  const stops = readCsv(zip, "stops.txt");
  const insertStop = db.prepare(
    `INSERT INTO stops (stop_id, stop_code, stop_name, stop_lat, stop_lon, stop_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const s of stops) {
      insertStop.run(
        s.stop_id,
        strOrNull(s.stop_code),
        strOrNull(s.stop_name),
        s.stop_lat ? Number(s.stop_lat) : null,
        s.stop_lon ? Number(s.stop_lon) : null,
        strOrNull(s.stop_url)
      );
    }
  })();

  // ----- calendar + calendar_dates -----
  console.log(`→ Importing calendar, calendar_dates...`);
  const calendar = readCsv(zip, "calendar.txt");
  const insertCal = db.prepare(
    `INSERT INTO calendar (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const c of calendar) {
      insertCal.run(
        c.service_id,
        Number(c.monday),
        Number(c.tuesday),
        Number(c.wednesday),
        Number(c.thursday),
        Number(c.friday),
        Number(c.saturday),
        Number(c.sunday),
        c.start_date,
        c.end_date
      );
    }
  })();

  const calDates = readCsv(zip, "calendar_dates.txt");
  const insertCalDate = db.prepare(
    `INSERT INTO calendar_dates (service_id, date, exception_type) VALUES (?, ?, ?)`
  );
  db.transaction(() => {
    for (const cd of calDates) {
      insertCalDate.run(cd.service_id, cd.date, Number(cd.exception_type));
    }
  })();

  // ----- trips -----
  console.log(`→ Importing trips...`);
  const trips = readCsv(zip, "trips.txt");
  const insertTrip = db.prepare(
    `INSERT INTO trips (trip_id, route_id, service_id, headsign, direction_id, block_id, shape_id, wheelchair_accessible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const t of trips) {
      insertTrip.run(
        t.trip_id,
        t.route_id,
        t.service_id,
        strOrNull(t.trip_headsign),
        intOrNull(t.direction_id),
        strOrNull(t.block_id),
        strOrNull(t.shape_id),
        intOrNull(t.wheelchair_accessible)
      );
    }
  })();

  // ----- stop_times (the big one — 463K rows) -----
  console.log(`→ Importing stop_times (this is the heavy one)...`);
  const t0 = Date.now();
  const stopTimes = readCsv(zip, "stop_times.txt");
  const insertST = db.prepare(
    `INSERT INTO stop_times (trip_id, stop_id, arrival_time, departure_time, stop_sequence)
     VALUES (?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const st of stopTimes) {
      insertST.run(
        st.trip_id,
        st.stop_id,
        st.arrival_time,
        st.departure_time,
        Number(st.stop_sequence)
      );
    }
  })();
  console.log(`   inserted ${fmt(stopTimes.length)} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // ----- shapes -----
  console.log(`→ Importing shapes...`);
  const shapes = readCsv(zip, "shapes.txt");
  const insertShape = db.prepare(
    `INSERT INTO shapes (shape_id, lat, lon, seq) VALUES (?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const s of shapes) {
      insertShape.run(
        s.shape_id,
        Number(s.shape_pt_lat),
        Number(s.shape_pt_lon),
        Number(s.shape_pt_sequence)
      );
    }
  })();

  // ============================================================
  // Materialized denormalizations
  // ============================================================
  console.log(`→ Building materialized tables (route_stops, route_directions, stop_routes)...`);

  // route_stops: pick the longest trip per (route, direction) and copy its
  // stop sequence. "Longest" = trip with the most stop_times rows; for routes
  // with multiple variants this gives us the canonical full path through
  // every stop the route ever serves in that direction.
  db.exec(`
    WITH longest_trip AS (
      SELECT t.route_id, t.direction_id, t.trip_id,
             COUNT(*) AS stop_count,
             ROW_NUMBER() OVER (
               PARTITION BY t.route_id, t.direction_id
               ORDER BY COUNT(*) DESC, t.trip_id
             ) AS rn
      FROM trips t
      JOIN stop_times st ON st.trip_id = t.trip_id
      GROUP BY t.route_id, t.direction_id, t.trip_id
    )
    INSERT INTO route_stops (route_id, direction_id, stop_id, stop_sequence)
    SELECT lt.route_id, lt.direction_id, st.stop_id, st.stop_sequence
    FROM longest_trip lt
    JOIN stop_times st ON st.trip_id = lt.trip_id
    WHERE lt.rn = 1;
  `);

  // route_directions: a single canonical record per (route, direction) with
  // the most common headsign, the canonical shape (longest), trip count,
  // and the first/last stop ids.
  db.exec(`
    WITH most_common_headsign AS (
      SELECT route_id, direction_id, headsign,
             COUNT(*) AS n,
             ROW_NUMBER() OVER (
               PARTITION BY route_id, direction_id
               ORDER BY COUNT(*) DESC
             ) AS rn
      FROM trips
      WHERE direction_id IS NOT NULL
      GROUP BY route_id, direction_id, headsign
    ),
    longest_shape AS (
      SELECT t.route_id, t.direction_id, t.shape_id,
             MAX(seq_count) AS pts,
             ROW_NUMBER() OVER (
               PARTITION BY t.route_id, t.direction_id
               ORDER BY MAX(seq_count) DESC
             ) AS rn
      FROM trips t
      JOIN (
        SELECT shape_id, COUNT(*) AS seq_count FROM shapes GROUP BY shape_id
      ) s ON s.shape_id = t.shape_id
      WHERE t.direction_id IS NOT NULL
      GROUP BY t.route_id, t.direction_id, t.shape_id
    ),
    trip_counts AS (
      SELECT route_id, direction_id, COUNT(*) AS n
      FROM trips WHERE direction_id IS NOT NULL
      GROUP BY route_id, direction_id
    ),
    first_last AS (
      SELECT rs.route_id, rs.direction_id,
             MIN(rs.stop_sequence) AS first_seq,
             MAX(rs.stop_sequence) AS last_seq
      FROM route_stops rs GROUP BY rs.route_id, rs.direction_id
    )
    INSERT INTO route_directions (route_id, direction_id, headsign, shape_id, trip_count, first_stop_id, last_stop_id)
    SELECT
      tc.route_id, tc.direction_id,
      (SELECT headsign FROM most_common_headsign mh
        WHERE mh.route_id = tc.route_id AND mh.direction_id = tc.direction_id AND mh.rn = 1),
      (SELECT shape_id FROM longest_shape ls
        WHERE ls.route_id = tc.route_id AND ls.direction_id = tc.direction_id AND ls.rn = 1),
      tc.n,
      (SELECT rs.stop_id FROM route_stops rs
         JOIN first_last fl ON fl.route_id = rs.route_id AND fl.direction_id = rs.direction_id
        WHERE rs.route_id = tc.route_id AND rs.direction_id = tc.direction_id
          AND rs.stop_sequence = fl.first_seq),
      (SELECT rs.stop_id FROM route_stops rs
         JOIN first_last fl ON fl.route_id = rs.route_id AND fl.direction_id = rs.direction_id
        WHERE rs.route_id = tc.route_id AND rs.direction_id = tc.direction_id
          AND rs.stop_sequence = fl.last_seq)
    FROM trip_counts tc;
  `);

  // stop_routes: every (stop, route) pair that occurs anywhere in a trip.
  db.exec(`
    INSERT INTO stop_routes (stop_id, route_id)
    SELECT DISTINCT st.stop_id, t.route_id
    FROM stop_times st
    JOIN trips t ON t.trip_id = st.trip_id;
  `);

  // ANALYZE so the query planner has stats for everything we just inserted.
  db.exec(`ANALYZE;`);

  // ============================================================
  // Stats
  // ============================================================
  const counts = (table: string) =>
    fmt((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n);

  const fi = db.prepare(`SELECT * FROM feed_meta LIMIT 1`).get() as
    | { publisher: string; start_date: string; end_date: string }
    | undefined;

  console.log("\n✅ Seed complete\n");
  console.log(`   Feed:           ${fi?.publisher} (valid ${fi?.start_date} → ${fi?.end_date})`);
  console.log(`   agencies:       ${counts("agencies")}`);
  console.log(`   routes:         ${counts("routes")}`);
  console.log(`   stops:          ${counts("stops")}`);
  console.log(`   trips:          ${counts("trips")}`);
  console.log(`   stop_times:     ${counts("stop_times")}`);
  console.log(`   shapes:         ${counts("shapes")} points`);
  console.log(`   calendar:       ${counts("calendar")}`);
  console.log(`   calendar_dates: ${counts("calendar_dates")}`);
  console.log(`   route_stops:    ${counts("route_stops")} (materialized)`);
  console.log(`   route_directions: ${counts("route_directions")} (materialized)`);
  console.log(`   stop_routes:    ${counts("stop_routes")} (materialized)`);

  const sizeMb = (fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`\n   transit.db size: ${sizeMb} MB → ${path.relative(process.cwd(), DB_PATH)}\n`);

  db.close();
}

try {
  main();
} catch (err) {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
}
