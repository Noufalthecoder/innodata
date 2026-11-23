"use client";

import { useState } from "react";

type Report = {
  total: number;
  rederived: { checked: number; matched: number; mismatches: string[] };
  visibility: { checked: number; passed: number; failures: string[] };
  reproducible: { checked: number; matched: number; failures: string[]; ids: string[] };
};

export default function ValidateTab() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bench/validate", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setReport(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rows = report
    ? [
        { label: "Answers re-derived from raw scene numbers (independent code)", ok: report.rederived.matched, n: report.rederived.checked },
        { label: "Visibility check passed", ok: report.visibility.passed, n: report.visibility.checked },
        { label: "Rebuilt identically from seed (sample)", ok: report.reproducible.matched, n: report.reproducible.checked },
      ]
    : [];

  return (
    <div className="max-w-3xl">
      <p className="text-lg leading-relaxed text-zinc-300">
        Ground truth must come from numbers we generated, never from a person or a model. This check proves it: it recomputes every answer with code that does not share logic with the generator, confirms
        the visibility check passed, and rebuilds a sample of tasks from their seeds.
      </p>
      <button onClick={run} disabled={busy} className="mt-6 rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50">
        {busy ? "Validating…" : "Run validation"}
      </button>
      {error && <p className="mt-4 text-red-300">{error}</p>}
      {report && (
        <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-6 py-4">
              <span className="text-zinc-300">{r.label}</span>
              <span className={`whitespace-nowrap font-semibold ${r.ok === r.n ? "text-emerald-300" : "text-red-300"}`}>
                {r.ok}/{r.n}
              </span>
            </div>
          ))}
          <p className="py-4 text-sm text-zinc-500">Tasks in dataset: {report.total}. Reproducibility sample: {report.reproducible.ids.join(", ")}.</p>
        </div>
      )}
      <div className="mt-10 border-t border-white/10 pt-6">
        <p className="text-sm font-medium text-white">The stability rule, in full</p>
        <p className="mt-2 text-zinc-400">
          A stack is stable only if, for every box, the horizontal centre of mass of all boxes above it lies within that box&apos;s top face. Boxes have equal size and equal density.
        </p>
        <pre className="mt-3 overflow-auto rounded-md border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">{`stable = every level i: lo(i-1) <= com(boxes i..top) <= hi(i-1)`}</pre>
      </div>
    </div>
  );
}
