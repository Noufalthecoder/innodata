"use client";

import { useEffect, useState } from "react";

type Acc = { n: number; correct: number; accuracy: number };
type ModelSummary = { provider: string; model: string; overall: Acc; errors: number; byTier: Record<string, Acc>; byKind: Record<string, Acc>; byObjects: Record<string, Acc>; byLighting: Record<string, Acc> };
type Summary = { generated: string; taskCount: number; models: ModelSummary[]; allWrong: string[] };

const pct = (a?: Acc) => (a && a.n ? `${(a.accuracy * 100).toFixed(0)}%` : "n/a");

export default function ResultsTab() {
  const [s, setS] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/bench/summary.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).then(setS).catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-zinc-400">No summary yet. Run <code className="text-zinc-200">npm run bench:report</code>.</p>;
  if (!s) return <p className="text-zinc-500">Loading…</p>;

  if (s.models.length === 0)
    return (
      <div className="max-w-2xl">
        <p className="text-lg text-zinc-300">No model results yet.</p>
        <p className="mt-3 text-zinc-400">This tab fills in automatically once a model has been evaluated:</p>
        <pre className="mt-4 overflow-auto rounded-md border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">{`npm run bench:eval -- --model gemini
npm run bench:eval -- --model anthropic
npm run bench:eval -- --model openai
npm run bench:report`}</pre>
        <p className="mt-4 text-sm text-zinc-500">{s.taskCount} tasks are ready to be evaluated. API keys go in .env.local.</p>
      </div>
    );

  const cols: [string, (m: ModelSummary) => Acc | undefined][] = [
    ["Overall", (m) => m.overall],
    ["Tier 1 · Pose", (m) => m.byTier.tier1],
    ["Tier 2 · Relative", (m) => m.byTier.tier2],
    ["Tier 3 · Stability", (m) => m.byTier.tier3],
    ["Normal light", (m) => m.byLighting.normal],
    ["Dim light", (m) => m.byLighting.dim],
  ];

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Model</th>
              {cols.map(([h]) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
              <th className="px-5 py-3 font-medium">Errors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {s.models.map((m) => (
              <tr key={m.model}>
                <td className="px-5 py-4 text-white">{m.model}</td>
                {cols.map(([h, f]) => (
                  <td key={h} className="px-5 py-4 text-zinc-300">
                    {pct(f(m))}
                  </td>
                ))}
                <td className="px-5 py-4 text-zinc-500">{m.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Scenes every evaluated model got wrong: {s.allWrong.length ? s.allWrong.join(", ") : "none"}. Generated {new Date(s.generated).toLocaleString()}.
      </p>
    </div>
  );
}
