import { NextRequest, NextResponse } from "next/server";
import { findNearbyStops } from "@/lib/transit/client";

/**
 * GET /api/transit/stops?lat=..&lon=..&distance=..
 * lat and lon are required — there is no server-side coordinate default;
 * callers (the UI or AI tools) must supply real coordinates.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (latStr == null || lonStr == null) {
    return NextResponse.json(
      { error: "lat and lon query parameters are required" },
      { status: 400 }
    );
  }
  const lat = Number(latStr);
  const lon = Number(lonStr);
  const distance = Number(searchParams.get("distance") ?? process.env.DEFAULT_RADIUS_M ?? 1000);

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
