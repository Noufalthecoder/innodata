import { taskTypes, variation } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function TaskTypes() {
  return (
    <section id="tasks" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="The tasks" title="Four kinds of reasoning, three tiers" sub="Each kind needs a different skill, not a reworded question. Difficulty varies independently within each one." />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {taskTypes.map((t, i) => (
          <Reveal key={t.title} delay={i * 0.06}>
            <article className="h-full overflow-hidden rounded-lg border border-white/10 bg-[#0e0f13]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt={`Example ${t.title.toLowerCase()} scene`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <p className="text-xs font-medium text-accent">{t.tier}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{t.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">&ldquo;{t.question}&rdquo;</p>
                <p className="mt-3 text-sm text-zinc-500">{t.rule}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-10 flex flex-wrap gap-2">
        {variation.map((v) => (
          <span key={v} className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400">{v}</span>
        ))}
      </Reveal>
    </section>
  );
}
