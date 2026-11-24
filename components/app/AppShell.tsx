"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import ResultsTab from "./ResultsTab";
import TasksTab from "./TasksTab";
import ValidateTab from "./ValidateTab";

const PipelineCanvas = dynamic(() => import("./pipeline/PipelineCanvas"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Loading pipeline…</div>,
});

/** secondary sections, opened as a panel over the pipeline */
const PANELS = [
  { id: "dataset", label: "Dataset", blurb: "The 60 pre-generated photoreal tasks, with ground truth, visibility reports and an interactive 3D view." },
  { id: "validation", label: "Validation Proof", blurb: "Re-derive every answer with independent code and rebuild tasks from their seeds." },
  { id: "leaderboard", label: "Leaderboard", blurb: "Accuracy of each evaluated model on the full dataset, by tier and lighting." },
] as const;
type PanelId = (typeof PANELS)[number]["id"];

export default function AppShell() {
  const [panel, setPanel] = useState<PanelId | null>(null);

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "");
      setPanel(PANELS.some((p) => p.id === h) ? (h as PanelId) : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && open(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  function open(id: PanelId | null) {
    setPanel(id);
    window.history.replaceState(null, "", id ? `#${id}` : window.location.pathname);
  }
  const current = PANELS.find((p) => p.id === panel);

  return (
    <div className="flex h-[100dvh] flex-col bg-ink">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-white">
            SpatialGrid
          </Link>
          <span className="hidden text-zinc-700 sm:inline">/</span>
          <h1 className="hidden truncate text-sm text-zinc-300 sm:block">Benchmark pipeline</h1>
        </div>
        <nav aria-label="Secondary" className="flex items-center gap-1 overflow-x-auto">
          {PANELS.map((p) => (
            <button
              key={p.id}
              onClick={() => open(panel === p.id ? null : p.id)}
              aria-pressed={panel === p.id}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${panel === p.id ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
            >
              {p.label}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
          <Link href="/" className="hidden whitespace-nowrap px-2 text-[13px] text-zinc-500 hover:text-white sm:block">
            ← Site
          </Link>
        </nav>
      </header>

      <main className="relative min-h-0 flex-1">
        <PipelineCanvas />

        {current && (
          <div className="absolute inset-0 z-30 flex justify-end bg-black/50 backdrop-blur-[2px]" onClick={() => open(null)}>
            <section
              role="dialog"
              aria-label={current.label}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-full max-w-[1100px] overflow-y-auto border-l border-white/10 bg-ink px-6 py-8 shadow-2xl shadow-black sm:px-10"
            >
              <div className="mb-8 flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">{current.label}</h2>
                  <p className="mt-1.5 text-zinc-400">{current.blurb}</p>
                </div>
                <button onClick={() => open(null)} className="shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:border-white/40 hover:text-white">
                  Close
                </button>
              </div>
              {current.id === "dataset" && <TasksTab />}
              {current.id === "validation" && <ValidateTab />}
              {current.id === "leaderboard" && <ResultsTab />}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
