"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { TripSchedule } from "@/lib/transit/types";
import {
  arrivalLabel,
  formatClock,
  inferTripProgress,
  routeNumberFromVariantKey,
} from "@/lib/transit/format";

// Leaflet touches `window`; load the map only on the client.
const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-2xl bg-white/5 text-white/70 ring-1 ring-white/10">
      Loading map…
    </div>
  ),
});

interface Props {
  tripKey: number;
}

const REFRESH_MS = 30_000;

export function TripView({ tripKey }: Props) {
  const [data, setData] = useState<TripSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch + auto-refresh. Keeps the previous data on screen while polling
  // so the map and stop list don't flash.
  useEffect(() => {
    let cancelled = false;
    const load = (initial: boolean) => {
      if (initial) setLoading(true);
      fetch(`/api/transit/trips/${tripKey}`)
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as TripSchedule;
        })
        .then((d) => {
          if (cancelled) return;
          setData(d);
          setError(null);
          setLastRefresh(new Date());
        })
        .catch((e) => {
          if (!cancelled) setError(e.message ?? "Could not load trip.");
        })
        .finally(() => {
          if (!cancelled && initial) setLoading(false);
        });
    };
    load(true);
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tripKey]);

  const stops = data?.trip?.scheduledStops ?? [];
  const queryTime = data?.queryTime;

  const { nextIndex, finished } = useMemo(
    () => inferTripProgress(stops, queryTime),
    [stops, queryTime]
  );

  const filteredStops = useMemo(() => {
    if (!search.trim()) return stops;
    const q = search.toLowerCase();
    return stops.filter((s) => (s.stop?.name ?? "").toLowerCase().includes(q));
  }, [stops, search]);

  const routeNumber = routeNumberFromVariantKey(data?.trip?.variant?.key);

  // Determine the "active" stop label for the LIVE banner.
  const nextStopName =
    !finished && stops[nextIndex]?.stop?.name ? stops[nextIndex].stop?.name : null;
  const nextStopEta = arrivalLabel(
    queryTime,
    stops[nextIndex]?.times?.arrival?.estimated ?? stops[nextIndex]?.times?.departure?.estimated
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-col gap-2 text-center">
        <div className="flex items-center justify-center gap-2">
          {!finished && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          )}
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
            {finished ? "Trip Ended" : "Live"}
          </span>
        </div>
        <h1 className="text-3xl font-bold">Live Bus Tracker</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-white/70">
          {routeNumber && (
            <span className="rounded-full bg-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-100 ring-1 ring-blue-300/40">
              Route {routeNumber}
            </span>
          )}
          <span>Trip #{tripKey}</span>
          <span>·</span>
          <span>{stops.length} stops</span>
        </div>
        {!finished && nextStopName && (
          <div className="mt-1 text-sm text-white/80">
            Next: <span className="font-semibold">{nextStopName}</span>{" "}
            <span className="text-blue-300">({nextStopEta})</span>
          </div>
        )}
      </header>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 ring-1 ring-white/20">
        <span className="text-white/70">🔍</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stops…"
          className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
        />
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div className="flex flex-col items-center gap-2 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <div className="font-semibold text-white">Going Live…</div>
          <div className="text-sm text-white/70">Fetching route and positions…</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-red-500/20 p-4 text-red-100 ring-1 ring-red-400/40">
          {error}
        </div>
      )}

      {/* Map + stop list */}
      {data && stops.length > 0 && (
        <>
          <TripMap
            scheduledStops={stops}
            nextStopIndex={nextIndex}
            finished={finished}
          />

          <div className="flex flex-col gap-2">
            {filteredStops.map((s) => {
              const idx = stops.indexOf(s);
              const isPassed = idx < nextIndex && !finished;
              const isNext = idx === nextIndex && !finished;
              const lat = s.stop?.centre?.geographic?.latitude;
              const lon = s.stop?.centre?.geographic?.longitude;
              return (
                <div
                  key={s.key}
                  className={[
                    "glass flex items-center justify-between rounded-2xl p-4 transition",
                    isNext && "ring-2 ring-blue-400/70",
                    isPassed && "opacity-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate font-semibold ${isPassed ? "line-through" : ""}`}>
                        {s.stop?.name ?? "Unnamed Stop"}
                      </span>
                      {isNext && (
                        <span className="rounded-full bg-blue-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-100 ring-1 ring-blue-300/40">
                          Next
                        </span>
                      )}
                    </div>
                    {lat != null && lon != null && (
                      <div className="mt-0.5 text-xs text-white/60">
                        ({lat.toFixed(4)}, {lon.toFixed(4)})
                        {s.stop?.number != null && <> · #{s.stop.number}</>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${isNext ? "text-blue-300" : "text-white/80"}`}>
                        {arrivalLabel(
                          queryTime,
                          s.times?.arrival?.estimated ?? s.times?.departure?.estimated
                        )}
                      </div>
                      <div className="text-xs text-white/50">
                        sched{" "}
                        {formatClock(
                          s.times?.arrival?.scheduled ?? s.times?.departure?.scheduled
                        )}
                      </div>
                    </div>
                    <span className="text-xl" aria-label="Bus stop">
                      🚌
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredStops.length === 0 && (
              <div className="rounded-xl bg-white/5 p-4 text-center text-white/60">
                No stops match &ldquo;{search}&rdquo;.
              </div>
            )}
          </div>

          {lastRefresh && (
            <div className="text-center text-xs text-white/50">
              Last updated {lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}{" "}
              · refreshing every {REFRESH_MS / 1000}s
            </div>
          )}
        </>
      )}
    </div>
  );
}
