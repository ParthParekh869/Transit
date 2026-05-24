"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Locate, AlertTriangle, RefreshCw } from "lucide-react";
import type { StopResponse, StopS } from "@/lib/transit/types";
import { StopCard } from "./StopCard";
import { StopCardSkeleton } from "./Skeleton";

interface Props {
  /** Search radius in meters. */
  radius: number;
}

type State =
  | { kind: "needs-permission" }
  | { kind: "requesting" }
  | { kind: "denied"; message: string }
  | { kind: "ready"; lat: number; lon: number };

export function StopsList({ radius }: Props) {
  const [state, setState] = useState<State>({ kind: "needs-permission" });
  const [stops, setStops] = useState<StopS[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/transit/stops?lat=${state.lat}&lon=${state.lon}&distance=${radius}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as StopResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const sorted = [...(data.stops ?? [])].sort(
          (a, b) => (a.distances?.direct ?? 0) - (b.distances?.direct ?? 0)
        );
        setStops(sorted);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Could not load stops.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state, radius]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState({ kind: "denied", message: "Your browser doesn't support geolocation." });
      return;
    }
    setState({ kind: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ kind: "ready", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) =>
        setState({
          kind: "denied",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Location access was denied. Allow it in your browser settings to see nearby stops."
              : `Could not get your location: ${err.message}`,
        }),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const filtered = useMemo(() => {
    if (!stops) return [];
    if (!search.trim()) return stops;
    const q = search.toLowerCase();
    return stops.filter((s) => (s.name ?? "").toLowerCase().includes(q));
  }, [stops, search]);

  // --- Permission gate ---
  if (state.kind !== "ready") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={state.kind}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-md"
        >
          <div className="glass-strong rounded-3xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 ring-1 ring-white/15">
              {state.kind === "requesting" ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                >
                  <Locate className="h-7 w-7 text-white" strokeWidth={1.8} />
                </motion.div>
              ) : state.kind === "denied" ? (
                <AlertTriangle className="h-7 w-7 text-rose-300" strokeWidth={1.8} />
              ) : (
                <MapPin className="h-7 w-7 text-white" strokeWidth={1.8} />
              )}
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {state.kind === "requesting"
                ? "Getting your location"
                : state.kind === "denied"
                  ? "Location unavailable"
                  : "Share your location"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/65">
              {state.kind === "requesting"
                ? "Look for the browser permission prompt at the top of your window."
                : state.kind === "denied"
                  ? state.message
                  : "We need your location to find transit stops near you. Coordinates are sent only to fetch the nearby stops list — nothing is stored."}
            </p>

            {state.kind !== "requesting" && (
              <motion.button
                onClick={requestLocation}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-glow-lg ring-1 ring-white/20 transition hover:shadow-glow-lg"
              >
                <Locate className="h-4 w-4" />
                {state.kind === "denied" ? "Try again" : "Allow location"}
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- Ready state ---
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stops by name…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder-white/40 outline-none ring-0 transition focus:border-cyan-400/50 focus:bg-white/[0.07]"
          />
        </div>
        <motion.button
          onClick={requestLocation}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          title="Refresh your location"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh location
        </motion.button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-white/35">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Centered at {state.lat.toFixed(4)}, {state.lon.toFixed(4)} · {radius} m radius
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          <AlertTriangle className="h-5 w-5 flex-none" />
          <div>{error}</div>
        </motion.div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <StopCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-white/55">
          No stops match your search.
        </div>
      )}

      <motion.div
        className="grid gap-4 sm:grid-cols-2"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
        }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((s) => (
            <motion.div
              key={s.key}
              layout
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <StopCard stop={s} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
