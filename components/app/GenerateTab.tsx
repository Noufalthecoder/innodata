"use client";

import { useEffect, useState } from "react";
import type { Kind, Task } from "@/lib/bench/types";
import TaskPanel from "./TaskPanel";

const KINDS: { id: Kind; label: string }[] = [
  { id: "orientation", label: "Tier 1 · Orientation" },
  { id: "closer", label: "Tier 2 · Closest" },
  { id: "leftmost", label: "Tier 2 · Left-most" },
  { id: "stability", label: "Tier 3 · Stability" },
];

type Provider = { id: string; label: string; model: string; configured: boolean };
type Ask = { raw?: string; choice?: number | null; correct?: boolean; error?: string; loading?: boolean };

export default function GenerateTab() {
  const [kind, setKind] = useState<Kind>("closer");
  const [objects, setObjects] = useState(3);
  const [lighting, setLighting] = useState<"normal" | "dim">("normal");
  const [task, setTask] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [asks, setAsks] = useState<Record<string, Ask>>({});
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    fetch("/api/bench/status").then((r) => r.json()).then((j) => setProviders(j.providers)).catch(() => {});
  }, []);

  const usesObjects = kind === "closer" || kind === "leftmost" || kind === "stability";
  const objMax = kind === "stability" ? 4 : 5;

  async function generate() {
    setBusy(true);
    setError("");
    setAsks({});
    setShowJson(false);
    try {
      const seed = 1_000_000 + Math.floor(Math.random() * 900_000_000);
      const res = await fetch("/api/bench/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, seed, objects: usesObjects ? Math.min(objects, objMax) : undefined, lighting }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setTask(j.task);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function ask(p: Provider) {
    if (!task) return;
    setAsks((a) => ({ ...a, [p.id]: { loading: true } }));
    try {
      const res = await fetch("/api/bench/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: p.id, kind: task.kind, seed: task.seed, objects: task.difficulty.objects, lighting: task.difficulty.lighting }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setAsks((a) => ({ ...a, [p.id]: j }));
    } catch (e) {
      setAsks((a) => ({ ...a, [p.id]: { error: (e as Error).message } }));
    }
  }

  const sel = "rounded-md border border-white/15 bg-ink px-3 py-2 text-sm text-white";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <label className="text-sm text-zinc-400">
          Task type
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={`${sel} mt-1 block`}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {usesObjects && (
          <label className="text-sm text-zinc-400">
            Objects
            <select value={Math.min(objects, objMax)} onChange={(e) => setObjects(Number(e.target.value))} className={`${sel} mt-1 block`}>
              {[2, 3, 4, 5].filter((n) => n <= objMax).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm text-zinc-400">
          Lighting
          <select value={lighting} onChange={(e) => setLighting(e.target.value as "normal" | "dim")} className={`${sel} mt-1 block`}>
            <option value="normal">Normal</option>
            <option value="dim">Dim</option>
          </select>
        </label>
        <button onClick={generate} disabled={busy} className="rounded-md bg-accent px-6 py-2.5 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50">
          {busy ? "Generating…" : "Generate a new scene"}
        </button>
      </div>

      {error && <p className="mb-6 text-red-300">{error}</p>}
      {!task && !busy && <p className="text-zinc-500">Generates a fresh scene on the server with computed ground truth and a visibility check. It can take a few seconds.</p>}

      {task && (
        <TaskPanel
          key={task.seed}
          task={task}
          extra={
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ask a vision model</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button key={p.id} onClick={() => ask(p)} disabled={!p.configured || asks[p.id]?.loading} title={p.configured ? p.model : "No API key configured on the server"} className="rounded-md border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-40">
                    {asks[p.id]?.loading ? "Asking…" : p.configured ? `Ask ${p.label}` : `${p.label} (add API key)`}
                  </button>
                ))}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {providers.map((p) => {
                  const a = asks[p.id];
                  if (!a || a.loading) return null;
                  return (
                    <li key={p.id} className={a.error ? "text-red-300" : a.correct ? "text-emerald-300" : "text-amber-300"}>
                      {p.label}: {a.error ? a.error : `${a.raw} (${a.choice === null || a.choice === undefined ? "unparsed" : task.options[a.choice]}) · ${a.correct ? "correct" : "wrong"}`}
                    </li>
                  );
                })}
              </ul>
              <button onClick={() => setShowJson((s) => !s)} className="mt-5 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
                {showJson ? "Hide" : "Show"} task JSON
              </button>
              {showJson && (
                <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-white/10 bg-black/40 p-4 text-xs text-zinc-300">{JSON.stringify({ ...task, image: "(omitted)" }, null, 2)}</pre>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
