import { problem } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function Problem() {
  return (
    <section id="problem" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="The problem" title="Describing a scene is not the same as acting in it" sub={problem.lead} />
      <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
        {problem.failures.map((f, i) => (
          <Reveal key={f.skill} delay={i * 0.06} className="bg-ink p-8">
            <p className="text-sm font-medium text-accent">{f.skill}</p>
            <h3 className="mt-3 text-xl font-semibold text-white">{f.question}</h3>
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-zinc-600">If the model is wrong</p>
            <p className="mt-2 leading-relaxed text-zinc-400">{f.cost}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
