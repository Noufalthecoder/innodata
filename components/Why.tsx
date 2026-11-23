import { why } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function Why() {
  return (
    <section id="why" className="relative py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[url(/images/horizon.jpg)] bg-cover bg-center opacity-50 [mask-image:linear-gradient(to_bottom,transparent,#000_35%,#000_55%,transparent)]" />
      <div className="relative mx-auto max-w-6xl px-6 pt-32">
        <SectionHead eyebrow="Why it matters" title="Errors here are not quiz mistakes" sub="They cause real damage in warehouses, factories and robotic systems." />
        <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
          {why.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.05} className="bg-ink p-8">
              <p className="text-sm font-medium text-accent">0{i + 1}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{w.title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-400">{w.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
