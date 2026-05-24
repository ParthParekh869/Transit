import { NextResponse } from "next/server";
import { getRouteByNumber } from "@/lib/transit/client";

/**
 * GET /api/transit/routes/{number}
 * Returns a single route's details (including badgeStyle), or 404 if not found.
 */
export async function GET(_req: Request, { params }: { params: { number: string } }) {
  const num = params.number;
  if (!num) {
    return NextResponse.json({ error: "route number is required" }, { status: 400 });
  }
  try {
    const route = await getRouteByNumber(num);
    if (!route) return NextResponse.json({ error: "route not found" }, { status: 404 });
    return NextResponse.json({ route });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
