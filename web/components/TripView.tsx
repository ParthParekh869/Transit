"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bus, AlertTriangle, Navigation, CheckCircle2 } from "lucide-react";
import type { TripSchedule } from "@/lib/transit/types";
import {
  arrivalLabel,
  formatClock,
  inferTripProgress,
  routeNumberFromVariantKey,
} from "@/lib/transit/format";

// Leaflet touches `window`; render the map only on the client.
const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="text-sm text-white/55">Loading map…</div>
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
  const [focusedStopKey, setFocusedStopKey] = useState<string | null>(null);

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
  const progress =
    stops.length > 0
      ? Math.min(1, finished ? 1 : nextIndex / stops.length)
      : 0;
  const nextStop = stops[nextIndex];
  const nextStopEta = arrivalLabel(
    queryTime,
    nextStop?.times?.arrival?.estimated ?? nextStop?.times?.departure?.estimated
  );

  // -- Loading --
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <motion.div
          className="relative flex h-16 w-16 items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-cyan-400" />
          <Bus className="h-6 w-6 text-white/80" />
        </motion.div>
        <div className="text-lg font-semibold text-white">Going Live…</div>
        <div className="text-sm text-white/55">Fetching route and positions</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6"
    >
      {/* HEADER */}
      <header className="space-y-3 text-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          {!finished ? (
            <>
              <span
                className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-live-pulse"
                aria-hidden
              />
              <span className="text-rose-200">Live</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-300" />
              <span className="text-emerald-200">Trip Ended</span>
            </>
          )}
        </motion.div>

        <h1 className="text-4xl font-bold tracking-tight text-white">
          Live Bus Tracker
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/65">
          {routeNumber && (
            <span className="rounded-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30 px-3 py-1 text-xs font-bold tracking-tight text-white ring-1 ring-white/15">
              Route {routeNumber}
            </span>
          )}
          <span className="font-mono tabular-nums text-white/50">Trip #{tripKey}</span>
          <span className="text-white/25">·</span>
          <span>{stops.length} stops</span>
        </div>

        {!finished && nextStop?.stop?.name && (
          <motion.div
            key={nextStop.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm"
          >
            <Navigation className="h-4 w-4 text-cyan-300" />
            <span className="text-white/55">Next:</span>
            <span className="truncate font-semibold text-white">
              {nextStop.stop.name}
            </span>
            <span className="font-bold tabular-nums text-cyan-300">{nextStopEta}</span>
          </motion.div>
        )}

        {/* Trip progress bar */}
        {stops.length > 0 && (
          <div className="mx-auto max-w-md space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="flex justify-between text-[10px] uppercase tracking-[0.16em] text-white/35">
              <span>{Math.min(nextIndex, stops.length)} passed</span>
              <span>{Math.max(0, stops.length - nextIndex)} ahead</span>
            </div>
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <AlertTriangle className="h-5 w-5 flex-none" />
          <div>{error}</div>
        </div>
      )}

      {data && stops.length > 0 && (
        <>
          {/* SEARCH */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stops…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.07]"
            />
          </div>

          {/* MAP */}
          <TripMap
            scheduledStops={stops}
            nextStopIndex={nextIndex}
            finished={finished}
            focusedStopKey={focusedStopKey}
          />

          {/* STOP LIST */}
          <motion.div
            className="flex flex-col gap-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.025 } },
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredStops.map((s) => {
                const idx = stops.indexOf(s);
                const isPassed = idx < nextIndex && !finished;
                const isNext = idx === nextIndex && !finished;
                const lat = s.stop?.centre?.geographic?.latitude;
                const lon = s.stop?.centre?.geographic?.longitude;
                const isFocused = focusedStopKey === s.key;
                return (
                  <motion.div
                    key={s.key}
                    layout
                    variants={{
                      hidden: { opacity: 0, x: -8 },
                      show: { opacity: 1, x: 0 },
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    onClick={() => setFocusedStopKey(s.key ?? null)}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    className={[
                      "group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border p-3.5 transition-all",
                      isFocused
                        ? "border-cyan-300/70 bg-cyan-500/[0.10] shadow-[0_0_0_2px_rgba(34,211,238,0.30)]"
                        : isNext
                          ? "border-cyan-400/40 bg-cyan-500/[0.06] shadow-[0_0_0_1px_rgba(34,211,238,0.18)]"
                          : isPassed
                            ? "border-white/5 bg-white/[0.015] opacity-55"
                            : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    {/* Index dot column */}
                    <div className="flex w-6 flex-none flex-col items-center">
                      <div
                        className={[
                          "h-2.5 w-2.5 rounded-full ring-2 ring-white/10",
                          isNext
                            ? "bg-cyan-400 ring-cyan-300/60"
                            : isPassed
                              ? "bg-white/30"
                              : "bg-white/15",
                        ].join(" ")}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`truncate font-semibold ${
                            isPassed ? "text-white/55 line-through decoration-white/30" : "text-white"
                          }`}
                        >
                          {s.stop?.name ?? "Unnamed Stop"}
                        </span>
                        {isNext && (
                          <span className="flex-none rounded-full bg-cyan-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200 ring-1 ring-cyan-300/30">
                            Next
                          </span>
                        )}
                        {isPassed && (
                          <CheckCircle2 className="h-3.5 w-3.5 flex-none text-emerald-400/70" />
                        )}
                      </div>
                      {lat != null && lon != null && (
                        <div className="mt-0.5 font-mono text-[10px] tabular-nums text-white/35">
                          {lat.toFixed(4)}, {lon.toFixed(4)}
                          {s.stop?.number != null && (
                            <span className="ml-2 text-white/25">#{s.stop.number}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-bold tabular-nums ${
                          isNext ? "text-cyan-300" : isPassed ? "text-white/40" : "text-white/80"
                        }`}
                      >
                        {arrivalLabel(
                          queryTime,
                          s.times?.arrival?.estimated ?? s.times?.departure?.estimated
                        )}
                      </div>
                      <div className="text-[10px] text-white/35">
                        sched{" "}
                        {formatClock(
                          s.times?.arrival?.scheduled ?? s.times?.departure?.scheduled
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredStops.length === 0 && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-white/55">
                No stops match &ldquo;{search}&rdquo;.
              </div>
            )}
          </motion.div>

          {lastRefresh && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/30">
              <span className="inline-block h-1 w-1 rounded-full bg-cyan-400" />
              Updated{" "}
              {lastRefresh.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}{" "}
              · refresh every {REFRESH_MS / 1000}s
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
