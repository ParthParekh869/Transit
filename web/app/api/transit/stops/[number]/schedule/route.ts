import { NextResponse } from "next/server";
import { getStopSchedule } from "@/lib/transit/client";

/**
 * GET /api/transit/stops/{number}/schedule
 * Proxies to https://api.winnipegtransit.com/v4/stops/{n}/schedule.json
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const stop = Number(number);
  if (!Number.isFinite(stop)) {
    return NextResponse.json({ error: "invalid stop number" }, { status: 400 });
  }

  try {
    const data = await getStopSchedule(stop);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
