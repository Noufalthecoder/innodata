"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GenerateTab from "./GenerateTab";
import PlayTab from "./PlayTab";
import ResultsTab from "./ResultsTab";
import TasksTab from "./TasksTab";
import ValidateTab from "./ValidateTab";

const TABS = [
  { id: "play", label: "Play", blurb: "Answer the same questions the models are asked." },
  { id: "generate", label: "Generate", blurb: "Create a fresh scene with computed ground truth, and ask a vision model about it." },
  { id: "tasks", label: "Tasks", blurb: "Browse the whole dataset with ground truth and visibility reports." },
  { id: "validate", label: "Validate", blurb: "Prove the answers are not hand-made." },
  { id: "results", label: "Results", blurb: "Model accuracy by tier and difficulty." },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AppShell() {
  const [tab, setTab] = useState<TabId>("play");

  useEffect(() => {
    const h = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);

  const select = (id: TabId) => {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              SpatialGrid
            </Link>
            <span className="rounded border border-white/15 px-2 py-0.5 text-xs text-zinc-400">App</span>
          </div>
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">
            ← Back to site
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6" aria-label="App sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => select(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${tab === t.id ? "border-accent text-white" : "border-transparent text-zinc-400 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{current.label}</h1>
        <p className="mb-10 mt-2 text-zinc-400">{current.blurb}</p>
        {tab === "play" && <PlayTab />}
        {tab === "generate" && <GenerateTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "validate" && <ValidateTab />}
        {tab === "results" && <ResultsTab />}
      </main>
    </div>
  );
}
