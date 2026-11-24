import Link from "next/link";
import { heroCase, REPORT_URL, stats } from "@/lib/content";

export default function Hero() {
  return (
    <section id="top" className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 lg:pt-40">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Innodata AI Hackathon 2026 · Visual Task Factory
          </p>
          <h1 className="text-5xl font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
            Before a robot reaches, it has to see.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            SpatialGrid is a benchmark factory for physical AI. It generates photoreal 3D scenes and asks vision models what a robot needs to know: what is nearest, how it is turned, and whether a stack will hold. Every answer is computed, not labelled.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/app" className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90">
              Open the app
            </Link>
            <a href={REPORT_URL} target="_blank" rel="noreferrer" className="rounded-md border border-white/20 px-6 py-3 font-medium text-white transition-colors hover:border-white/50">
              Read the report
            </a>
          </div>
        </div>

        <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#0e0f13] shadow-2xl shadow-black/50">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroCase.image} alt="A stack of four coloured boxes on a workshop floor" className="aspect-[4/3] w-full object-cover" />
            <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur">
              task {heroCase.id} · tier 3 · stability
            </span>
          </div>
          <figcaption className="p-5">
            <p className="font-medium text-white">{heroCase.question}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {heroCase.answers.map((a) => (
                <li key={a.model} className="flex items-center justify-between">
                  <span className="text-zinc-400">
                    {a.model} <span className="text-zinc-600">· {a.vendor}</span>
                  </span>
                  <span className={a.ok ? "text-emerald-400" : "text-red-400"}>{a.said} {a.ok ? "✓" : "✕"}</span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="font-medium text-zinc-200">Computed answer</span>
                <span className="font-medium text-emerald-400">{heroCase.truth} ✓</span>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">{heroCase.why}</p>
          </figcaption>
        </figure>
      </div>

      <dl className="mt-20 grid grid-cols-2 border-y border-white/10 md:grid-cols-4">
        {stats.map((b, i) => (
          <div key={b.label} className={`py-6 md:px-6 ${i > 0 ? "md:border-l md:border-white/10" : "md:pl-0"}`}>
            <dt className="text-3xl font-semibold tracking-tight text-white">{b.value}</dt>
            <dd className="mt-1 text-sm text-zinc-500">{b.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
