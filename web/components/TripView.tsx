"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bus,
  AlertTriangle,
  Navigation,
  CheckCircle2,
  Star,
  MapPin,
} from "lucide-react";
import type { RoutesR, TripSchedule } from "@/lib/transit/types";
import {
  arrivalLabel,
  formatClock,
  inferTripProgress,
  relativeStopLabel,
  routeNumberFromVariantKey,
} from "@/lib/transit/format";

// Leaflet touches `window`; render the map only on the client.
const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="text-sm text-white/55">Loading map…</div>
    </div>
  ),
});

interface Props {
  tripKey: number;
}

const REFRESH_MS = 30_000;

export function TripView({ tripKey }: Props) {
  const searchParams = useSearchParams();
  const fromStopParam = searchParams?.get("fromStop");
  const interestStopNumber = fromStopParam ? Number(fromStopParam) : null;

  const [data, setData] = useState<TripSchedule | null>(null);
  const [route, setRoute] = useState<RoutesR | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [focusedStopKey, setFocusedStopKey] = useState<string | null>(null);

  // Trip data fetch + auto-refresh.
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

  // Once the trip is loaded, fetch the route's badgeStyle for theming.
  const variantKey = data?.trip?.variant?.key;
  const routeNumber = useMemo(() => routeNumberFromVariantKey(variantKey), [variantKey]);
  useEffect(() => {
    if (!routeNumber) return;
    let cancelled = false;
    fetch(`/api/transit/routes/${encodeURIComponent(routeNumber)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        const j = (await r.json()) as { route?: RoutesR };
        return j.route ?? null;
      })
      .then((r) => {
        if (!cancelled && r) setRoute(r);
      })
      .catch(() => {
        // Theming is optional; swallow and fall back to defaults.
      });
    return () => {
      cancelled = true;
    };
  }, [routeNumber]);

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

  const progress =
    stops.length > 0 ? Math.min(1, finished ? 1 : nextIndex / stops.length) : 0;
  const nextStop = stops[nextIndex];
  const nextStopEta = arrivalLabel(
    queryTime,
    nextStop?.times?.arrival?.estimated ?? nextStop?.times?.departure?.estimated
  );

  // The user's "stop of interest" — match by stop number across the trip.
  const interestEntry = useMemo(() => {
    if (interestStopNumber == null) return null;
    const idx = stops.findIndex((s) => s.stop?.number === interestStopNumber);
    if (idx < 0) return null;
    return { idx, stop: stops[idx] };
  }, [stops, interestStopNumber]);

  const interestPassed =
    interestEntry != null && (finished || interestEntry.idx < nextIndex);
  const interestProgress =
    interestEntry != null && stops.length > 0 ? interestEntry.idx / stops.length : null;

  const routeBadge = route?.badgeStyle ?? null;
  const routeAccent = routeBadge?.backgroundColor ?? "#22d3ee";
  const routeLabel = route?.badgeLabel ? String(route.badgeLabel) : routeNumber ?? "BUS";

  // --- Loading ---
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

        <h1 className="text-4xl font-bold tracking-tight text-white">Live Bus Tracker</h1>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/65">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold tracking-tight ring-1"
            style={{
              backgroundColor: routeBadge?.backgroundColor ?? "#1e293b",
              color: routeBadge?.color ?? "#ffffff",
              borderColor: routeBadge?.borderColor ?? "rgba(255,255,255,0.2)",
            }}
          >
            Route {routeLabel}
          </span>
          <span className="font-mono tabular-nums text-white/50">Trip #{tripKey}</span>
          <span className="text-white/25">·</span>
          <span>{stops.length} stops</span>
          {route?.name && (
            <>
              <span className="text-white/25">·</span>
              <span className="truncate text-white/70">{route.name}</span>
            </>
          )}
        </div>

        {!finished && nextStop?.stop?.name && (
          <motion.div
            key={nextStop.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm"
          >
            <Navigation className="h-4 w-4" style={{ color: routeAccent }} />
            <span className="text-white/55">Next:</span>
            <span className="truncate font-semibold text-white">{nextStop.stop.name}</span>
            <span className="font-bold tabular-nums" style={{ color: routeAccent }}>
              {nextStopEta}
            </span>
          </motion.div>
        )}

        {/* ENHANCED PROGRESS BAR with origin / your-stop / bus / destination markers */}
        {stops.length > 0 && (
          <ProgressBar
            progress={progress}
            interestProgress={interestProgress}
            stops={stops.length}
            nextIndex={nextIndex}
            finished={finished}
            accent={routeAccent}
          />
        )}
      </header>

      {/* INTEREST-STOP BANNER */}
      {interestEntry && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 rounded-2xl border p-4 ${
            interestPassed
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-amber-300/30 bg-amber-500/10"
          }`}
        >
          <div
            className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${
              interestPassed
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {interestPassed ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Star className="h-5 w-5 fill-current" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              {interestPassed ? "Bus already passed" : "Your stop"}
            </div>
            <div className="truncate text-base font-semibold text-white">
              {interestEntry.stop.stop?.name}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-lg font-bold tabular-nums ${
                interestPassed ? "text-emerald-200" : "text-amber-200"
              }`}
            >
              {relativeStopLabel(
                queryTime,
                interestEntry.stop.times?.arrival?.estimated ??
                  interestEntry.stop.times?.departure?.estimated
              )}
            </div>
            <button
              onClick={() => setFocusedStopKey(interestEntry.stop.key ?? null)}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-white/55 transition hover:text-white"
            >
              <MapPin className="h-3 w-3" />
              Show on map
            </button>
          </div>
        </motion.div>
      )}

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
            interestStopNumber={interestStopNumber}
            routeBadgeStyle={routeBadge}
            routeLabel={routeLabel}
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
                const isInterest =
                  interestStopNumber != null && s.stop?.number === interestStopNumber;
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
                        : isInterest
                          ? "border-amber-300/40 bg-amber-500/[0.06] shadow-[0_0_0_1px_rgba(251,191,36,0.20)]"
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
                          isInterest
                            ? "bg-amber-300 ring-amber-200/60"
                            : isNext
                              ? "ring-cyan-300/60"
                              : isPassed
                                ? "bg-white/30"
                                : "bg-white/15",
                        ].join(" ")}
                        style={isNext && !isInterest ? { backgroundColor: routeAccent } : undefined}
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
                        {isInterest && (
                          <Star className="h-3.5 w-3.5 flex-none fill-amber-300 text-amber-300" />
                        )}
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
                          isInterest
                            ? "text-amber-200"
                            : isNext
                              ? "text-cyan-300"
                              : isPassed
                                ? "text-white/40"
                                : "text-white/80"
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

/**
 * Annotated trip progress bar.
 *   Origin -------- (your stop) ----- (bus) -------- Destination
 * The fill is the route's accent color so the whole tracker feels themed.
 */
function ProgressBar({
  progress,
  interestProgress,
  stops,
  nextIndex,
  finished,
  accent,
}: {
  progress: number;
  interestProgress: number | null;
  stops: number;
  nextIndex: number;
  finished: boolean;
  accent: string;
}) {
  return (
    <div className="mx-auto max-w-md space-y-2">
      <div className="relative h-2 rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${accent}88, ${accent})`,
            boxShadow: `0 0 12px ${accent}99`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Origin tick */}
        <div className="absolute left-0 top-1/2 h-3 w-px -translate-y-1/2 bg-white/40" />
        {/* Destination tick */}
        <div className="absolute right-0 top-1/2 h-3 w-px -translate-y-1/2 bg-white/40" />

        {/* Bus marker on the bar */}
        {!finished && (
          <motion.div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{
              left: `${progress * 100}%`,
              width: 14,
              height: 14,
              background: accent,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          />
        )}

        {/* Interest-stop marker on the bar */}
        {interestProgress != null && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${interestProgress * 100}%` }}
          >
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.7)]" />
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] uppercase tracking-[0.16em] text-white/40">
        <span>Origin</span>
        <span className="text-white/55">
          {Math.min(nextIndex, stops)} / {stops} stops
        </span>
        <span>Destination</span>
      </div>
    </div>
  );
}
