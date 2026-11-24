import { findings } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function Findings() {
  return (
    <section id="findings" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead
        eyebrow="What we found"
        title="Models can tell what is near. They cannot tell how it is turned, or whether it will hold."
        sub="Six vision models from Google, Alibaba, Mistral AI and Meta, 60 photoreal tasks each, temperature 0. The weaknesses are about reasoning, not visibility: lighting made no consistent difference."
      />
      <div className="grid gap-10 md:grid-cols-3">
        {findings.map((f, i) => (
          <Reveal key={f.label} delay={i * 0.08}>
            <div className="border-t border-white/15 pt-6">
              <p className={`text-5xl font-semibold tracking-tight ${f.tone === "good" ? "text-emerald-400" : "text-accent"}`}>{f.value}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{f.label}</h3>
              <p className="mt-2 leading-relaxed text-zinc-400">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
