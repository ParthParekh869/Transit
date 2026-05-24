/**
 * AI tool definitions for the Winnipeg Transit assistant.
 *
 * Each tool wraps one of the four upstream API endpoints exposed by
 * /lib/transit/client.ts and is described with a JSON Schema that
 * function-calling LLMs can consume directly.
 *
 * Two formats are exported so you can drop these into whichever provider
 * you choose later without rewriting:
 *   - `openAITools`     — for OpenAI Chat Completions / Responses API
 *                         and the Vercel AI SDK
 *   - `anthropicTools`  — for Anthropic Messages API
 *
 * The `executeTool` function is the single dispatcher. Wire your LLM's
 * tool-call output into it; everything else (auth, types, errors) is
 * already handled by the transit client.
 *
 * --- Example wire-up (pseudo-code) ---
 *   import OpenAI from "openai";
 *   import { openAITools, executeTool } from "@/ai/tools";
 *
 *   const openai = new OpenAI();
 *   const resp = await openai.chat.completions.create({
 *     model: "gpt-4o-mini",
 *     tools: openAITools,
 *     messages: [{ role: "user", content: "When's the next 60 from stop 10064?" }],
 *   });
 *   for (const call of resp.choices[0].message.tool_calls ?? []) {
 *     const result = await executeTool(call.function.name, JSON.parse(call.function.arguments));
 *     // ...send result back to the model
 *   }
 */

import {
  findNearbyStops,
  getRoutesForStop,
  getStopSchedule,
  getTripDetail,
} from "@/lib/transit/client";

// --- Tool schemas (provider-agnostic) -------------------------------------

interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

const tools: ToolSpec[] = [
  {
    name: "findNearbyStops",
    description:
      "Find Winnipeg Transit stops within a radius of a latitude/longitude point. " +
      "Use this when the user asks for stops near a location, near them, or near a place name " +
      "(geocode the place name first, then call this).",
    parameters: {
      type: "object",
      required: ["lat", "lon"],
      properties: {
        lat: { type: "number", description: "Latitude in decimal degrees, e.g. 49.8094." },
        lon: { type: "number", description: "Longitude in decimal degrees, e.g. -97.1304." },
        distance: {
          type: "number",
          description: "Search radius in meters. Default 1000.",
          default: 1000,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getRoutesForStop",
    description:
      "List the bus routes that serve a given stop number. Use this when the user wants to " +
      "know which routes stop at a particular stop.",
    parameters: {
      type: "object",
      required: ["stopNumber"],
      properties: {
        stopNumber: {
          type: "integer",
          description: "Winnipeg Transit stop number (e.g. 10064).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getStopSchedule",
    description:
      "Get the live schedule (next arrivals/departures, with scheduled vs. estimated times) " +
      "for a given stop number. This is the primary tool to answer 'when's the next bus' questions.",
    parameters: {
      type: "object",
      required: ["stopNumber"],
      properties: {
        stopNumber: {
          type: "integer",
          description: "Winnipeg Transit stop number.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getTripDetail",
    description:
      "Get the full stop-by-stop detail of a trip — every stop on the bus's route with " +
      "lat/lons and arrival times. Use this after getStopSchedule when the user wants to know " +
      "where the bus is going or to track a specific bus.",
    parameters: {
      type: "object",
      required: ["tripKey"],
      properties: {
        tripKey: {
          type: "integer",
          description: "Trip key returned in scheduledStops[].tripKey from getStopSchedule.",
        },
      },
      additionalProperties: false,
    },
  },
];

// --- OpenAI / Vercel AI SDK format ---------------------------------------

export const openAITools = tools.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

// --- Anthropic format -----------------------------------------------------

export const anthropicTools = tools.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.parameters,
}));

// --- Dispatcher -----------------------------------------------------------

export type ToolName = "findNearbyStops" | "getRoutesForStop" | "getStopSchedule" | "getTripDetail";

/**
 * Dispatches a tool call by name. Throws if the tool is unknown or the args
 * are missing required fields. Returns whatever the upstream API returns
 * (already JSON-shaped, ready to feed back to the model).
 */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name as ToolName) {
    case "findNearbyStops": {
      const lat = num(args.lat, "lat");
      const lon = num(args.lon, "lon");
      const distance = args.distance == null ? 1000 : num(args.distance, "distance");
      return findNearbyStops({ lat, lon, distance });
    }
    case "getRoutesForStop": {
      return getRoutesForStop(num(args.stopNumber, "stopNumber"));
    }
    case "getStopSchedule": {
      return getStopSchedule(num(args.stopNumber, "stopNumber"));
    }
    case "getTripDetail": {
      return getTripDetail(num(args.tripKey, "tripKey"));
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function num(v: unknown, field: string): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new Error(`Tool argument "${field}" must be a number, got ${JSON.stringify(v)}`);
  }
  return n;
}
