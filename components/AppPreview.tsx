import Link from "next/link";
import { appFeatures } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function AppPreview() {
  return (
    <section id="app" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="The app" title="Everything in the benchmark, in one app" sub="The app runs the same code as the command-line pipeline. Explore the scenes in 3D, try the questions yourself, and re-run validation in the browser." />
      <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
        {appFeatures.map((f, i) => (
          <Reveal key={f.id} delay={i * 0.04} className="bg-ink">
            <Link href={`/app#${f.id}`} className="group block h-full p-6 transition-colors hover:bg-white/[0.03]">
              <p className="text-sm font-medium text-accent">0{i + 1}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              <p className="mt-4 text-sm text-zinc-500 transition-colors group-hover:text-white">Open →</p>
            </Link>
          </Reveal>
        ))}
      </div>
      <Link href="/app" className="mt-8 inline-block rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90">
        Open SpatialGrid
      </Link>
    </section>
  );
}
