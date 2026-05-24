import { NavBar } from "@/components/NavBar";

export default function AboutPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-300/80">
            About
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">How it works</h1>
        </header>

        <div className="space-y-5 text-sm leading-relaxed text-white/70">
          <p>
            This is the web companion to the Transit iOS app. Both clients call the same{" "}
            <a
              className="text-cyan-300 underline-offset-2 hover:underline"
              href="https://api.winnipegtransit.com/"
              target="_blank"
              rel="noreferrer"
            >
              Winnipeg Transit Open Data API
            </a>{" "}
            (v4). The site is a thin server-side proxy plus a presentation layer over four
            endpoints.
          </p>

          <ul className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-5 font-mono text-xs text-white/75">
            <li><span className="text-cyan-300">GET</span> /api/transit/stops — nearby stops</li>
            <li><span className="text-cyan-300">GET</span> /api/transit/routes?stop=N — routes serving a stop</li>
            <li><span className="text-cyan-300">GET</span> /api/transit/stops/{`{n}`}/schedule — live schedule</li>
            <li><span className="text-cyan-300">GET</span> /api/transit/trips/{`{key}`} — full trip detail</li>
          </ul>

          <p>
            Each of these endpoints is also exposed as an AI tool in <code className="rounded bg-white/5 px-1.5 py-0.5 text-cyan-200">/ai/tools.ts</code>,
            ready to be plugged into any function-calling LLM (OpenAI, Anthropic, Vercel AI SDK).
          </p>
        </div>
      </main>
    </>
  );
}
