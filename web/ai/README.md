# AI Layer

This folder contains the seam between the Transit data layer and any LLM you
want to add later. It does **not** call an LLM itself — that's intentional, so
you can pick OpenAI, Anthropic, a local model, or the Vercel AI SDK without
rewriting the data plumbing.

## What's here

- **`tools.ts`** — The four Winnipeg Transit operations (`findNearbyStops`,
  `getRoutesForStop`, `getStopSchedule`, `getTripDetail`) packaged as
  function-calling tools. Exports them in both OpenAI/Vercel and Anthropic
  formats, plus a single `executeTool(name, args)` dispatcher.

## How to wire up an LLM later

### Option A — OpenAI / Vercel AI SDK

```ts
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { openAITools, executeTool } from "@/ai/tools";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system:
      "You are a Winnipeg Transit assistant. Use the provided tools to answer " +
      "questions about stops, routes, and live schedules. Times from the API are " +
      "Winnipeg local time.",
    messages,
    tools: openAITools,
    toolChoice: "auto",
    onToolCall: async ({ toolCall }) =>
      executeTool(toolCall.toolName, toolCall.args as Record<string, unknown>),
  });
  return result.toDataStreamResponse();
}
```

Then add a `useChat()` component to the UI — done.

### Option B — Anthropic

```ts
import Anthropic from "@anthropic-ai/sdk";
import { anthropicTools, executeTool } from "@/ai/tools";

const client = new Anthropic();
const message = await client.messages.create({
  model: "claude-3-5-sonnet-latest",
  max_tokens: 1024,
  tools: anthropicTools,
  messages: [{ role: "user", content: "When's the next 60 from stop 10064?" }],
});
// Loop over message.content for tool_use blocks, call executeTool, feed
// tool_result blocks back, repeat until stop_reason === "end_turn".
```

## Why this shape

Each tool corresponds 1:1 with one of the **API routes** under
`app/api/transit/*`, which themselves are 1:1 with **endpoints** of the
Winnipeg Transit Open Data API. That means:

- The same data flows through the UI, the public HTTP API, and the LLM tools.
- Adding a new capability (e.g. trip planning) only requires touching three
  files: `lib/transit/client.ts`, `app/api/transit/.../route.ts`, and
  `ai/tools.ts`.
- An LLM can answer questions the UI doesn't even have screens for, because
  it works directly off the same primitives.
