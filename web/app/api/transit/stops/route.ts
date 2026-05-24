import { NextRequest, NextResponse } from "next/server";
import { findNearbyStops } from "@/lib/transit/client";

/**
 * GET /api/transit/stops?lat=..&lon=..&distance=..
 * Proxies to https://api.winnipegtransit.com/v4/stops.json
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat") ?? process.env.DEFAULT_LAT ?? 49.809438);
  const lon = Number(searchParams.get("lon") ?? process.env.DEFAULT_LON ?? -97.130437);
  const distance = Number(
    searchParams.get("distance") ?? process.env.DEFAULT_RADIUS_M ?? 1000
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon must be numbers" }, { status: 400 });
  }

  try {
    const data = await findNearbyStops({ lat, lon, distance });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
