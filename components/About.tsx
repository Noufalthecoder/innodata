import { aboutParagraphs } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="About" title="Teaching machines to see space" />
      <div className="grid gap-8 md:grid-cols-3">
        {aboutParagraphs.map((p, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <p className="border-t border-white/15 pt-5 text-lg leading-relaxed text-zinc-300">{p}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
