import { steps } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="How it works" title="Three steps, fully automatic" sub="The entire loop is repeatable and needs no human grading." />
      <div className="grid gap-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <div className="border-t border-white/15 pt-6">
              <p className="text-sm font-medium text-accent">Step {i + 1}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-zinc-400">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
