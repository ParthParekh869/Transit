import { NextRequest, NextResponse } from "next/server";
import { getRoutesForStop } from "@/lib/transit/client";

/**
 * GET /api/transit/routes?stop=10064
 * Proxies to https://api.winnipegtransit.com/v4/routes.json?stop=N
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stop = Number(searchParams.get("stop"));

  if (!Number.isFinite(stop)) {
    return NextResponse.json({ error: "stop is required" }, { status: 400 });
  }

  try {
    const data = await getRoutesForStop(stop);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
