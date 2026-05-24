/**
 * Server-side Winnipeg Transit API client.
 * - Hides the API key (kept in env, never sent to the browser)
 * - Always passes json-camel-case=true so responses match our TS types
 * - Provides one function per upstream endpoint — these are the same
 *   four operations exposed as AI tools in /ai/tools.ts.
 */

import type {
  StopResponse,
  RoutesResponse,
  RoutesR,
  StopScheduleResponse,
  TripSchedule,
} from "./types";

const BASE = "https://api.winnipegtransit.com/v4";

function apiKey(): string {
  const k = process.env.WINNIPEG_TRANSIT_API_KEY;
  if (!k) {
    throw new Error(
      "WINNIPEG_TRANSIT_API_KEY is not set. Copy .env.local.example to .env.local."
    );
  }
  return k;
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams({
    "api-key": apiKey(),
    "json-camel-case": "true",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const url = `${BASE}${path}?${qs.toString()}`;

  const res = await fetch(url, {
    // Treat schedules as fresh — Winnipeg Transit data updates frequently.
    next: { revalidate: 15 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Winnipeg Transit API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

/** Find transit stops within `distance` meters of (lat, lon). */
export function findNearbyStops(args: {
  lat: number;
  lon: number;
  distance?: number;
}): Promise<StopResponse> {
  return get<StopResponse>("/stops.json", {
    lat: args.lat,
    lon: args.lon,
    distance: args.distance ?? 1000,
  });
}

/** List the routes that serve a given stop number. */
export function getRoutesForStop(stopNumber: number): Promise<RoutesResponse> {
  return get<RoutesResponse>("/routes.json", { stop: stopNumber });
}

/** Live schedule (next arrivals) for a stop number. */
export function getStopSchedule(stopNumber: number): Promise<StopScheduleResponse> {
  return get<StopScheduleResponse>(`/stops/${stopNumber}/schedule.json`, {});
}

/** Full trip detail — stop list, lat/lons — for a tripKey. */
export function getTripDetail(tripKey: number): Promise<TripSchedule> {
  return get<TripSchedule>(`/trips/${tripKey}.json`, {});
}

/**
 * Look up a single route by its number. Returns the route record (with
 * its `badgeStyle`) so the UI can theme the live tracker by route color,
 * or null if the route is unknown.
 *
 * Uses the path-based endpoint `/routes/{number}.json` — the query-filter
 * form (`/routes.json?route=N`) silently ignores the filter and returns
 * a paginated list of unrelated routes, so don't use it.
 */
export async function getRouteByNumber(
  routeNumber: string | number
): Promise<RoutesR | null> {
  try {
    const data = await get<{ route?: RoutesR }>(
      `/routes/${encodeURIComponent(String(routeNumber))}.json`,
      {}
    );
    return data.route ?? null;
  } catch {
    // 404 / parse failure / unknown route — caller treats as null and skips theming.
    return null;
  }
}
