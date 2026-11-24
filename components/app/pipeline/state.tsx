"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Kind, Task } from "@/lib/bench/types";

export type Status = "idle" | "running" | "done" | "failed" | "skipped";
export type Stage = "scene" | "preview" | "truth" | "visibility";
export type Slot = "claude" | "gpt" | "gemini";

export type Provider = { id: string; label: string; model: string; configured: boolean };
export type RunResult = { status: Status; modelId?: string; label?: string; raw?: string; choice?: number | null; correct?: boolean; error?: string; ms?: number };

export const SLOTS: { slot: Slot; name: string; color: string; envVar: string }[] = [
  { slot: "claude", name: "Claude", color: "#d97757", envVar: "ANTHROPIC_API_KEY" },
  { slot: "gpt", name: "GPT-4o", color: "#10a37f", envVar: "OPENAI_API_KEY" },
  { slot: "gemini", name: "Gemini", color: "#4f8cff", envVar: "GEMINI_API_KEY" },
];
/** the model ids each slot can run; Gemini offers the Gemini-API family (incl. open-weights Gemma) */
const SLOT_MODELS: Record<Slot, (id: string) => boolean> = {
  claude: (id) => id.startsWith("claude"),
  gpt: (id) => id.startsWith("gpt"),
  gemini: (id) => id.startsWith("gemini") || id.startsWith("gemma"),
};

export type Config = { kind: Kind; objects: number; lighting: "normal" | "dim" };

type Ctx = {
  cfg: Config;
  setCfg: (c: Partial<Config>) => void;
  task: Task | null;
  genError: string;
  stages: Record<Stage, Status>;
  generating: boolean;
  generate: () => void;
  providers: Provider[];
  loaded: boolean;
  slotModels: (s: Slot) => Provider[];
  slotModel: Record<Slot, string>;
  setSlotModel: (s: Slot, id: string) => void;
  selected: Record<Slot, boolean>;
  toggle: (s: Slot) => void;
  runs: Record<Slot, RunResult>;
  running: boolean;
  run: () => void;
  canRun: boolean;
  view3d: boolean;
  setView3d: (v: boolean) => void;
};

const PipelineCtx = createContext<Ctx | null>(null);
export const usePipeline = () => {
  const c = useContext(PipelineCtx);
  if (!c) throw new Error("usePipeline outside provider");
  return c;
};

/** provider errors arrive as "429 {json}"; keep the status code and the human message */
function cleanError(m: string) {
  const code = /^(\d{3})\b/.exec(m)?.[1];
  const msg = /"message"\s*:\s*"([^"]+)/.exec(m)?.[1];
  return msg ? `${code ? code + " · " : ""}${msg}` : m;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const idleRuns = (): Record<Slot, RunResult> => ({ claude: { status: "idle" }, gpt: { status: "idle" }, gemini: { status: "idle" } });
const idleStages = (): Record<Stage, Status> => ({ scene: "idle", preview: "idle", truth: "idle", visibility: "idle" });

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfgState] = useState<Config>({ kind: "closer", objects: 3, lighting: "normal" });
  const [task, setTask] = useState<Task | null>(null);
  const [genError, setGenError] = useState("");
  const [stages, setStages] = useState(idleStages);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slotModel, setSlotModelState] = useState<Record<Slot, string>>({ claude: "claude-sonnet-5-5", gpt: "gpt-4o", gemini: "gemini-3.1-flash-lite" });
  const [selected, setSelected] = useState<Record<Slot, boolean>>({ claude: false, gpt: false, gemini: true });
  const [runs, setRuns] = useState(idleRuns);
  const [view3d, setView3d] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const genId = useRef(0);

  useEffect(() => {
    fetch("/api/bench/status")
      .then((r) => r.json())
      .then((j: { providers: Provider[] }) => {
        setProviders(j.providers);
        // pre-select Gemini (free tier); the others can be switched on when their key has credit
        const has = (s: Slot) => j.providers.some((p) => SLOT_MODELS[s](p.id) && p.configured);
        setSelected({ claude: false, gpt: !has("gemini") && has("gpt"), gemini: has("gemini") });
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  const slotModels = useCallback((s: Slot) => providers.filter((p) => SLOT_MODELS[s](p.id)), [providers]);
  const slotConfigured = useCallback((s: Slot) => slotModels(s).some((p) => p.configured), [slotModels]);

  const setCfg = (c: Partial<Config>) => setCfgState((o) => ({ ...o, ...c }));
  const setSlotModel = (s: Slot, id: string) => setSlotModelState((o) => ({ ...o, [s]: id }));
  const toggle = (s: Slot) => slotConfigured(s) && setSelected((o) => ({ ...o, [s]: !o[s] }));
  const set = (k: Stage, v: Status) => setStages((o) => ({ ...o, [k]: v }));

  const generating = Object.values(stages).includes("running");
  const running = Object.values(runs).some((r) => r.status === "running");

  async function generate() {
    if (generating || running) return;
    const id = ++genId.current;
    setGenError("");
    setTask(null);
    setRuns(idleRuns());
    setView3d(false);
    setStages({ scene: "running", preview: "idle", truth: "idle", visibility: "idle" });
    try {
      const usesObjects = cfg.kind !== "orientation";
      const seed = 1_000_000 + Math.floor(Math.random() * 900_000_000);
      const res = await fetch("/api/bench/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: cfg.kind, seed, objects: usesObjects ? Math.min(cfg.objects, cfg.kind === "stability" ? 4 : 5) : undefined, lighting: cfg.lighting }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      if (id !== genId.current) return;
      const t: Task = j.task;
      // the server returns the finished task; each stage is revealed in pipeline order with its real output
      set("scene", "done");
      setTask(t);
      for (const s of ["preview", "truth", "visibility"] as Stage[]) {
        set(s, "running");
        await wait(450);
        if (id !== genId.current) return;
        set(s, s === "visibility" && !t.visibility.every((v) => v.ok) ? "failed" : "done");
      }
    } catch (e) {
      setGenError((e as Error).message);
      set("scene", "failed");
    }
  }

  const canRun = Boolean(task) && stages.visibility === "done" && !running && SLOTS.some((s) => selected[s.slot] && slotConfigured(s.slot));

  async function run() {
    if (!task || !canRun) return;
    const t = task;
    setRuns(() => {
      const r = idleRuns();
      for (const s of SLOTS) r[s.slot] = { status: selected[s.slot] && slotConfigured(s.slot) ? "running" : "skipped" };
      return r;
    });
    await Promise.all(
      SLOTS.filter((s) => selected[s.slot] && slotConfigured(s.slot)).map(async (s) => {
        const modelId = slotModel[s.slot];
        const label = providers.find((p) => p.id === modelId)?.label ?? modelId;
        const t0 = performance.now();
        try {
          const res = await fetch("/api/bench/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, kind: t.kind, seed: t.seed, objects: t.difficulty.objects, lighting: t.difficulty.lighting }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
          setRuns((o) => ({ ...o, [s.slot]: { status: "done", modelId, label, raw: j.raw, choice: j.choice, correct: j.correct, ms: performance.now() - t0 } }));
        } catch (e) {
          setRuns((o) => ({ ...o, [s.slot]: { status: "failed", modelId, label, error: cleanError((e as Error).message), ms: performance.now() - t0 } }));
        }
      }),
    );
  }

  const value = useMemo<Ctx>(
    () => ({ cfg, setCfg, task, genError, stages, generating, generate, providers, loaded, slotModels, slotModel, setSlotModel, selected, toggle, runs, running, run, canRun, view3d, setView3d }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg, task, genError, stages, generating, providers, loaded, slotModels, slotModel, selected, runs, running, canRun, view3d],
  );
  return <PipelineCtx.Provider value={value}>{children}</PipelineCtx.Provider>;
}
