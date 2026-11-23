import { pipeline } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="How it works" title="The answer exists before the image does" sub="Every task starts as numbers. The picture is rendered from them, and the answer is calculated from them. No person and no AI decides what is correct." />
      <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-5">
        {pipeline.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.06} className="bg-ink p-6">
            <div>
              <p className="font-mono text-sm text-accent">0{i + 1}</p>
              <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
