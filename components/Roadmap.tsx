import { deliverables, roadmap } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="Roadmap" title="From first render to submission" />
      <ol className="divide-y divide-white/10 border-y border-white/10">
        {roadmap.map((r, i) => (
          <Reveal key={r.title} delay={0.02 * i}>
            <li className="grid gap-2 py-6 md:grid-cols-[160px_1fr_1.2fr] md:gap-8">
              <span className="text-sm font-medium text-accent">{r.date}</span>
              <h3 className="font-semibold text-white">{r.title}</h3>
              <p className="text-zinc-400">{r.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>

      <div className="mt-24">
        <SectionHead eyebrow="Deliverables" title="What we hand in" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {deliverables.map((d, i) => (
            <Reveal key={d.title} delay={i * 0.05}>
              <div className="border-t border-white/15 pt-5">
                <h3 className="font-semibold text-white">{d.title}</h3>
                <p className="mt-2 leading-relaxed text-zinc-400">{d.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
