"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RoutesResponse, StopS } from "@/lib/transit/types";
import { formatDistance } from "@/lib/transit/format";
import { RouteBadge } from "./RouteBadge";

interface Props {
  stop: StopS;
}

export function StopCard({ stop }: Props) {
  const [routes, setRoutes] = useState<RoutesResponse["routes"]>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stop.number == null) return;
    let cancelled = false;
    fetch(`/api/transit/routes?stop=${stop.number}`)
      .then((r) => r.json() as Promise<RoutesResponse>)
      .then((data) => {
        if (!cancelled) setRoutes(data.routes ?? []);
      })
      .catch(() => {
        if (!cancelled) setRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stop.number]);

  return (
    <Link
      href={`/stops/${stop.number}`}
      className="block glass rounded-2xl p-4 transition hover:bg-white/15 hover:shadow-lg"
    >
      <div>
        <h3 className="text-lg font-semibold leading-tight text-white">
          {stop.name ?? "Unknown Stop"}
        </h3>
        <div className="mt-1 flex gap-3 text-xs text-white/70">
          <span>#{stop.number}</span>
          <span>{formatDistance(stop.distances?.direct)}</span>
          {stop.direction && <span>{stop.direction}</span>}
        </div>
      </div>

      <div className="my-3 h-px bg-white/15" />

      {loading ? (
        <div className="text-xs text-white/50">Loading routes…</div>
      ) : routes && routes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {routes.map((r) => (
            <RouteBadge
              key={String(r.key)}
              label={String(r.badgeLabel ?? r.key ?? "")}
              style={r.badgeStyle}
            />
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/50">No routes serve this stop.</div>
      )}
    </Link>
  );
}
