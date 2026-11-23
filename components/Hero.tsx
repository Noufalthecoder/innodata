import Link from "next/link";
import { badges, GITHUB_URL } from "@/lib/content";
import Countdown from "./Countdown";

export default function Hero() {
  return (
    <section id="top" className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 pb-16 pt-32">
      <p className="mb-6 text-sm font-medium text-accent">Innodata AI Hackathon 2026 · Track 2: Visual Task Factory</p>
      <h1 className="text-6xl font-semibold tracking-tight text-white sm:text-8xl">SpatialGrid</h1>
      <p className="mt-6 max-w-2xl text-2xl font-medium leading-snug text-zinc-100 sm:text-3xl">
        A spatial and pose reasoning benchmark for physical AI.
      </p>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-300">
        Where things are, how they are turned, and whether a stack will fall, with every answer verified independently of the model being tested.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/app" className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90">
          Open SpatialGrid
        </Link>
        <a href="#how" className="rounded-md border border-white/25 px-6 py-3 font-medium text-white transition-colors hover:border-white/60">
          See how it works
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md px-3 py-3 font-medium text-zinc-300 underline-offset-4 transition-colors hover:text-white hover:underline">
          View source
        </a>
      </div>
      <div className="mt-14">
        <p className="mb-2 text-sm text-zinc-500">Submission closes in</p>
        <Countdown />
      </div>
      <dl className="mt-16 grid grid-cols-2 border-y border-white/10 md:grid-cols-4">
        {badges.map((b, i) => (
          <div key={b.label} className={`px-1 py-6 md:px-6 ${i > 0 ? "md:border-l md:border-white/10" : "md:pl-0"}`}>
            <dt className="text-3xl font-semibold text-white">{b.value}</dt>
            <dd className="mt-1 text-sm text-zinc-400">{b.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
