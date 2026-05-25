-- Winnipeg Transit GTFS — SQLite schema
--
-- Built and populated from web/data/google-transit.zip by web/scripts/seed-gtfs.ts.
-- Re-running the seed is safe: every CREATE is paired with DROP IF EXISTS,
-- and the seed runs inside a transaction.
--
-- Conventions:
--   * GTFS-style hex colors stored without the leading "#" (e.g. "00b262").
--     Add the "#" on the way out.
--   * Time strings ("HH:MM:SS") stored as TEXT; values can exceed "24:00:00"
--     for trips that wrap past midnight — that's expected per the GTFS spec.
--   * Foreign keys are declared but enforcement is OFF during seed (faster);
--     runtime opens the DB with PRAGMA foreign_keys = ON.

-- ============================================================
-- Reset
-- ============================================================
DROP TABLE IF EXISTS predicted_delays;
DROP TABLE IF EXISTS realtime_arrivals;
DROP TABLE IF EXISTS model_versions;
DROP TABLE IF EXISTS stop_routes;
DROP TABLE IF EXISTS route_directions;
DROP TABLE IF EXISTS route_stops;
DROP TABLE IF EXISTS calendar_dates;
DROP TABLE IF EXISTS calendar;
DROP TABLE IF EXISTS shapes;
DROP TABLE IF EXISTS stop_times;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS stops;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS agencies;
DROP TABLE IF EXISTS feed_meta;

-- ============================================================
-- Feed-level metadata (one row per import)
-- ============================================================
CREATE TABLE feed_meta (
  publisher    TEXT,
  publisher_url TEXT,
  lang         TEXT,
  contact_email TEXT,
  start_date   TEXT,                         -- YYYYMMDD inclusive
  end_date     TEXT,                         -- YYYYMMDD inclusive
  imported_at  INTEGER NOT NULL              -- unix epoch (seconds)
);

-- ============================================================
-- GTFS core (mirrors the spec; only fields we use are materialized)
-- ============================================================
CREATE TABLE agencies (
  agency_id   TEXT PRIMARY KEY,              -- "" if absent in feed
  name        TEXT NOT NULL,
  url         TEXT,
  timezone    TEXT,
  lang        TEXT,
  phone       TEXT
);

CREATE TABLE routes (
  route_id    TEXT PRIMARY KEY,              -- e.g. "38", "F6", "BLUE"
  short_name  TEXT,
  long_name   TEXT,
  type        INTEGER,                       -- 3 = bus per GTFS
  url         TEXT,
  color       TEXT,                          -- 6-char hex, no leading "#"
  text_color  TEXT,
  sort_order  INTEGER
);
CREATE INDEX idx_routes_sort ON routes(sort_order);

CREATE TABLE stops (
  stop_id     TEXT PRIMARY KEY,
  stop_code   TEXT,                          -- typically equals stop_id; the public number
  stop_name   TEXT,
  stop_lat    REAL,
  stop_lon    REAL,
  stop_url    TEXT
);
CREATE INDEX idx_stops_code ON stops(stop_code);
-- For "find nearby" we scan all 3873 stops with haversine in-process;
-- no spatial index needed at this size. Add SQLite r-tree later if scale demands.

CREATE TABLE trips (
  trip_id      TEXT PRIMARY KEY,
  route_id     TEXT NOT NULL REFERENCES routes(route_id),
  service_id   TEXT NOT NULL,
  headsign     TEXT,
  direction_id INTEGER,                      -- 0 or 1
  block_id     TEXT,
  shape_id     TEXT,
  wheelchair_accessible INTEGER              -- 0 unknown / 1 yes / 2 no
);
CREATE INDEX idx_trips_route_dir ON trips(route_id, direction_id);
CREATE INDEX idx_trips_service   ON trips(service_id);
CREATE INDEX idx_trips_shape     ON trips(shape_id);

CREATE TABLE stop_times (
  trip_id        TEXT NOT NULL REFERENCES trips(trip_id),
  stop_id        TEXT NOT NULL REFERENCES stops(stop_id),
  arrival_time   TEXT NOT NULL,              -- "HH:MM:SS", may exceed 24:00:00
  departure_time TEXT NOT NULL,
  stop_sequence  INTEGER NOT NULL,
  PRIMARY KEY (trip_id, stop_sequence)
) WITHOUT ROWID;                             -- saves ~30% on this 463K-row table
CREATE INDEX idx_st_stop_dep   ON stop_times(stop_id, departure_time);
CREATE INDEX idx_st_trip_seq   ON stop_times(trip_id, stop_sequence);

CREATE TABLE shapes (
  shape_id TEXT NOT NULL,
  lat      REAL NOT NULL,
  lon      REAL NOT NULL,
  seq      INTEGER NOT NULL,
  PRIMARY KEY (shape_id, seq)
) WITHOUT ROWID;

CREATE TABLE calendar (
  service_id TEXT PRIMARY KEY,
  monday     INTEGER NOT NULL,
  tuesday    INTEGER NOT NULL,
  wednesday  INTEGER NOT NULL,
  thursday   INTEGER NOT NULL,
  friday     INTEGER NOT NULL,
  saturday   INTEGER NOT NULL,
  sunday     INTEGER NOT NULL,
  start_date TEXT NOT NULL,                  -- YYYYMMDD
  end_date   TEXT NOT NULL
);

CREATE TABLE calendar_dates (
  service_id     TEXT NOT NULL,
  date           TEXT NOT NULL,              -- YYYYMMDD
  exception_type INTEGER NOT NULL,           -- 1 = service added, 2 = service removed
  PRIMARY KEY (service_id, date)
);

-- ============================================================
-- Materialized denormalizations (built at the end of the seed)
--
-- These exist so the most common UI queries are simple lookups
-- instead of multi-table joins. They are derived data — re-run the
-- seed to rebuild them.
-- ============================================================

-- Per (route, direction): which stops are served, in canonical order.
-- "Canonical" = the order observed on the trip with the most stops for
-- that direction (longest variant — the one that hits every stop).
CREATE TABLE route_stops (
  route_id      TEXT NOT NULL REFERENCES routes(route_id),
  direction_id  INTEGER NOT NULL,
  stop_id       TEXT NOT NULL REFERENCES stops(stop_id),
  stop_sequence INTEGER NOT NULL,
  PRIMARY KEY (route_id, direction_id, stop_sequence)
);
CREATE INDEX idx_rs_stop ON route_stops(stop_id);

-- Per (route, direction): the metadata we need for the route-detail page.
CREATE TABLE route_directions (
  route_id       TEXT NOT NULL REFERENCES routes(route_id),
  direction_id   INTEGER NOT NULL,
  headsign       TEXT,                       -- most common headsign on this direction
  shape_id       TEXT,                       -- canonical shape (longest)
  trip_count     INTEGER NOT NULL,
  first_stop_id  TEXT,
  last_stop_id   TEXT,
  PRIMARY KEY (route_id, direction_id)
);

-- Per stop: which routes serve it. Used by the stop-detail page.
CREATE TABLE stop_routes (
  stop_id  TEXT NOT NULL REFERENCES stops(stop_id),
  route_id TEXT NOT NULL REFERENCES routes(route_id),
  PRIMARY KEY (stop_id, route_id)
);
CREATE INDEX idx_sr_route ON stop_routes(route_id);

-- ============================================================
-- Future-ready: delay prediction storage
--
-- Empty tables. Queries should LEFT JOIN these so missing rows
-- (no realtime data, no model trained yet) gracefully fall back.
-- ============================================================

-- Raw observations from a future GTFS-Realtime poller.
CREATE TABLE realtime_arrivals (
  trip_id          TEXT NOT NULL,
  stop_id          TEXT NOT NULL,
  stop_sequence    INTEGER NOT NULL,
  scheduled_time   TEXT NOT NULL,
  observed_time    TEXT NOT NULL,
  delay_seconds    INTEGER NOT NULL,         -- observed - scheduled
  observed_at      INTEGER NOT NULL,         -- unix epoch when polled
  PRIMARY KEY (trip_id, stop_sequence, observed_at)
);
CREATE INDEX idx_rt_stop_recent  ON realtime_arrivals(stop_id, observed_at DESC);
CREATE INDEX idx_rt_trip_recent  ON realtime_arrivals(trip_id, observed_at DESC);

-- Model-emitted delay predictions, written by an offline job.
CREATE TABLE predicted_delays (
  trip_id              TEXT NOT NULL,
  stop_id              TEXT NOT NULL,
  stop_sequence        INTEGER NOT NULL,
  predicted_delay_secs INTEGER NOT NULL,
  confidence           REAL,                 -- 0..1
  model_version        TEXT,
  predicted_at         INTEGER NOT NULL,
  PRIMARY KEY (trip_id, stop_sequence)
);
CREATE INDEX idx_pd_stop ON predicted_delays(stop_id);

CREATE TABLE model_versions (
  version       TEXT PRIMARY KEY,
  trained_at    INTEGER NOT NULL,
  baseline_mae  REAL,                        -- mean absolute error (seconds) on validation
  notes         TEXT
);
