import { NextResponse } from "next/server";
import { getTripDetail } from "@/lib/transit/client";

/**
 * GET /api/transit/trips/{key}
 * Proxies to https://api.winnipegtransit.com/v4/trips/{key}.json
 */
export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const tripKey = Number(params.key);
  if (!Number.isFinite(tripKey)) {
    return NextResponse.json({ error: "invalid trip key" }, { status: 400 });
  }

  try {
    const data = await getTripDetail(tripKey);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
