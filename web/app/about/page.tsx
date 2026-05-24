import { NavBar } from "@/components/NavBar";

export default function AboutPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8 text-white/85 leading-relaxed">
        <h1 className="mb-4 text-3xl font-bold text-white">About</h1>
        <p>
          This is the web companion to the Transit iOS app. Both clients call the same{" "}
          <a className="underline" href="https://api.winnipegtransit.com/" target="_blank" rel="noreferrer">
            Winnipeg Transit Open Data API
          </a>{" "}
          (v4). The site is a thin proxy + presentation layer over four endpoints:
        </p>
        <ul className="my-4 list-disc space-y-1 pl-6 text-sm">
          <li><code>/api/transit/stops</code> — nearby stops</li>
          <li><code>/api/transit/routes?stop=N</code> — routes serving a stop</li>
          <li><code>/api/transit/stops/{`{n}`}/schedule</code> — live schedule</li>
          <li><code>/api/transit/trips/{`{key}`}</code> — full trip detail with stops & coords</li>
        </ul>
        <p>
          Each of these endpoints is also exposed as an AI tool in <code>/ai/tools.ts</code>, ready
          to be plugged into any function-calling LLM (OpenAI, Anthropic, Vercel AI SDK).
        </p>
      </main>
    </>
  );
}
