import { samples } from "@/lib/content";
import { Reveal, SectionHead } from "./Section";

export default function Results() {
  return (
    <section id="results" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead eyebrow="Results" title="Sample questions and ground truth" sub="Accuracy by tier and difficulty will appear here once the benchmark run is complete." />
      <Reveal>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tier</th>
                <th className="px-5 py-3 font-medium">Question</th>
                <th className="px-5 py-3 font-medium">Ground truth from</th>
                <th className="px-5 py-3 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {samples.map((r) => (
                <tr key={r.q}>
                  <td className="whitespace-nowrap px-5 py-4 text-accent">{r.tier}</td>
                  <td className="px-5 py-4 text-zinc-200">{r.q}</td>
                  <td className="px-5 py-4 text-zinc-400">{r.truth}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-zinc-500">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}
