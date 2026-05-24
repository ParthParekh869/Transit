"use client";

import { useEffect, useMemo, useState } from "react";
import type { StopResponse, StopS } from "@/lib/transit/types";
import { StopCard } from "./StopCard";

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
    const url = `/api/transit/stops?lat=${state.lat}&lon=${state.lon}&distance=${radius}`;
    fetch(url)
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
      setState({
        kind: "denied",
        message: "Your browser doesn't support geolocation.",
      });
      return;
    }
    setState({ kind: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          kind: "ready",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
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

  // --- Permission gate states ---
  if (state.kind === "needs-permission" || state.kind === "denied") {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-6 text-center">
        <div className="mb-3 text-4xl">📍</div>
        <h2 className="text-xl font-semibold">Share your location</h2>
        <p className="mt-2 text-sm text-white/70">
          We need your location to find transit stops near you. Nothing is stored —
          your coordinates are sent only to fetch the nearby stops list.
        </p>
        {state.kind === "denied" && (
          <div className="mt-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-100 ring-1 ring-red-400/40">
            {state.message}
          </div>
        )}
        <button
          onClick={requestLocation}
          className="mt-5 rounded-xl bg-white/20 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/30"
        >
          {state.kind === "denied" ? "Try again" : "Allow location"}
        </button>
      </div>
    );
  }

  if (state.kind === "requesting") {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-6 text-center">
        <div className="mb-3 text-4xl">📡</div>
        <h2 className="text-xl font-semibold">Getting your location…</h2>
        <p className="mt-2 text-sm text-white/70">
          Look for the browser permission prompt.
        </p>
      </div>
    );
  }

  // --- Ready state ---
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stops by name…"
          className="flex-1 rounded-xl bg-white/15 px-4 py-3 text-white placeholder-white/60 outline-none ring-1 ring-white/20 focus:ring-white/40"
        />
        <button
          onClick={requestLocation}
          className="rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/25"
          title="Refresh your location"
        >
          Refresh location
        </button>
      </div>

      <div className="text-xs text-white/60">
        Centered at {state.lat.toFixed(4)}, {state.lon.toFixed(4)} · radius {radius} m
      </div>

      {loading && <div className="text-white/70">Loading nearby stops…</div>}
      {error && (
        <div className="rounded-xl bg-red-500/20 p-4 text-red-100 ring-1 ring-red-400/40">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-white/70">No stops found nearby.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => (
          <StopCard key={s.key} stop={s} />
        ))}
      </div>
    </div>
  );
}
