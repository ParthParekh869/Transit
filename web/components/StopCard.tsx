"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, ChevronRight } from "lucide-react";
import type { RoutesResponse, StopS } from "@/lib/transit/types";
import { formatDistance } from "@/lib/transit/format";
import { RouteBadge } from "./RouteBadge";
import { Skeleton } from "./Skeleton";

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
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
      <Link
        href={`/stops/${stop.number}`}
        className="group relative block overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:border-white/15 hover:bg-white/[0.06] hover:shadow-glow-lg"
      >
        {/* Top accent line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 ring-1 ring-white/10">
            <MapPin className="h-5 w-5 text-white/85" strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold leading-tight text-white">
              {stop.name ?? "Unknown Stop"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/55">
              <span className="font-mono tabular-nums">#{stop.number}</span>
              <span className="text-white/20">·</span>
              <span>{formatDistance(stop.distances?.direct)}</span>
              {stop.direction && (
                <>
                  <span className="text-white/20">·</span>
                  <span>{stop.direction}</span>
                </>
              )}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 flex-none text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
        </div>

        <div className="my-4 h-px bg-white/5" />

        {loading ? (
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ) : routes && routes.length > 0 ? (
          <motion.div
            className="flex flex-wrap gap-1.5"
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.03 } },
              hidden: {},
            }}
          >
            {routes.map((r) => (
              <motion.div
                key={String(r.key)}
                variants={{
                  hidden: { opacity: 0, scale: 0.85 },
                  show: { opacity: 1, scale: 1 },
                }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              >
                <RouteBadge
                  label={String(r.badgeLabel ?? r.key ?? "")}
                  style={r.badgeStyle}
                  size="sm"
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-xs text-white/40">No routes serve this stop.</div>
        )}
      </Link>
    </motion.div>
  );
}
