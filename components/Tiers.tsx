import { tiers } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function Tiers() {
  return (
    <section id="tiers" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="Challenges" title="Three tiers, three modifiers" sub="Difficulty comes from real visual and physical complexity, not reworded questions." />
      <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((t, i) => (
          <Reveal key={t.n} delay={(i % 3) * 0.05} className="bg-ink p-7">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-accent">{t.tag}</span>
              <span className="text-sm text-zinc-600">{t.n}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{t.title}</h3>
            <p className="mt-2 leading-relaxed text-zinc-400">{t.body}</p>
            <p className="mt-5 text-sm italic text-zinc-500">&ldquo;{t.example}&rdquo;</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
