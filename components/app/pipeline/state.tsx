"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BYOK_PROVIDERS, byokProvider, validKey, validModelId, type ByokProvider } from "@/lib/bench/byok";
import type { Kind, Task } from "@/lib/bench/types";

export type Status = "idle" | "running" | "done" | "failed" | "skipped";
export type Stage = "scene" | "preview" | "truth" | "visibility";
export type Slot = "gemini" | "llama" | "mistral" | "qwen" | "byok";

export type Provider = { id: string; label: string; model: string; configured: boolean; note?: string };
export type RunResult = { status: Status; modelId?: string; label?: string; raw?: string; choice?: number | null; correct?: boolean; error?: string; ms?: number; keySource?: "user" | "server" };

/** one lane per AI company, plus "Your model", which runs whatever is set in the Model Config node */
export const SLOTS: { slot: Slot; name: string; vendor: string; color: string; envVar: string; match: (id: string) => boolean; default: string }[] = [
  { slot: "gemini", name: "Gemini", vendor: "Google", color: "#4f8cff", envVar: "GEMINI_API_KEY", match: (id) => id.startsWith("gemini") || id.startsWith("gemma"), default: "gemini-3.1-flash-lite" },
  { slot: "llama", name: "Llama 4", vendor: "Meta", color: "#22d3ee", envVar: "CLOUDFLARE_API_TOKEN", match: (id) => id.startsWith("@cf/meta/"), default: "@cf/meta/llama-4-scout-17b-16e-instruct" },
  { slot: "mistral", name: "Mistral", vendor: "Mistral AI", color: "#facc15", envVar: "CLOUDFLARE_API_TOKEN", match: (id) => id.startsWith("@cf/mistralai/"), default: "@cf/mistralai/mistral-small-3.1-24b-instruct" },
  { slot: "qwen", name: "Qwen", vendor: "Alibaba", color: "#a78bfa", envVar: "CLOUDFLARE_API_TOKEN", match: (id) => id.startsWith("@cf/qwen/"), default: "@cf/qwen/qwen3.8-27b" },
  { slot: "byok", name: "Your model", vendor: "Bring your own key", color: "#10a37f", envVar: "", match: () => false, default: "" },
];
const SLOT_MODELS = Object.fromEntries(SLOTS.map((s) => [s.slot, s.match])) as Record<Slot, (id: string) => boolean>;
const bySlot = <T,>(f: (s: Slot) => T) => Object.fromEntries(SLOTS.map((s) => [s.slot, f(s.slot)])) as Record<Slot, T>;

export type Config = { kind: Kind; objects: number; lighting: "normal" | "dim" };

export type KeyStatus = "untested" | "testing" | "valid" | "invalid";
/** Bring Your Own Key settings. Held in React state only: never in storage, so a refresh or closed tab forgets the key. */
export type Byok = { provider: ByokProvider; model: string; custom: string; useCustom: boolean; key: string; status: KeyStatus; message: string };

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
  laneReady: (s: Slot) => boolean;
  laneLabel: (s: Slot) => string;
  laneNote: (s: Slot) => string;
  runs: Record<Slot, RunResult>;
  running: boolean;
  run: () => void;
  canRun: boolean;
  view3d: boolean;
  setView3d: (v: boolean) => void;
  byok: Byok;
  setByok: (b: Partial<Byok>) => void;
  byokModels: { id: string; label: string }[];
  byokModelId: string;
  serverKeys: Record<string, boolean>;
  testKey: () => void;
};

const PipelineCtx = createContext<Ctx | null>(null);
export const usePipeline = () => {
  const c = useContext(PipelineCtx);
  if (!c) throw new Error("usePipeline outside provider");
  return c;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const idleRuns = (): Record<Slot, RunResult> => bySlot(() => ({ status: "idle" as Status }));
const idleStages = (): Record<Stage, Status> => ({ scene: "idle", preview: "idle", truth: "idle", visibility: "idle" });

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfgState] = useState<Config>({ kind: "closer", objects: 3, lighting: "normal" });
  const [task, setTask] = useState<Task | null>(null);
  const [genError, setGenError] = useState("");
  const [stages, setStages] = useState(idleStages);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [serverKeys, setServerKeys] = useState<Record<string, boolean>>({});
  const [slotModel, setSlotModelState] = useState<Record<Slot, string>>(() => bySlot((s) => SLOTS.find((x) => x.slot === s)!.default));
  const [selected, setSelected] = useState<Record<Slot, boolean>>(() => bySlot((s) => s === "gemini"));
  const [runs, setRuns] = useState(idleRuns);
  const [view3d, setView3d] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [byok, setByokState] = useState<Byok>({ provider: "anthropic", model: BYOK_PROVIDERS[0].models[0].id, custom: "", useCustom: false, key: "", status: "untested", message: "" });
  const [openrouterModels, setOpenrouterModels] = useState<{ id: string; label: string }[] | null>(null);
  const genId = useRef(0);
  const testId = useRef(0);

  useEffect(() => {
    fetch("/api/bench/status")
      .then((r) => r.json())
      .then((j: { providers: Provider[]; serverKeys?: Record<string, boolean> }) => {
        setProviders(j.providers);
        setServerKeys(j.serverKeys ?? {});
        // pre-select every company lane that is configured; "Your model" switches on when a key is entered
        const has = (s: Slot) => j.providers.some((p) => SLOT_MODELS[s](p.id) && p.configured);
        setSelected(bySlot((s) => s !== "byok" && has(s)));
        // each slot starts on its first configured model
        setSlotModelState((o) => {
          const n = { ...o };
          for (const { slot: s } of SLOTS) {
            if (s === "byok") continue;
            const cur = j.providers.find((p) => p.id === o[s]);
            if (!cur?.configured) n[s] = j.providers.find((p) => SLOT_MODELS[s](p.id) && p.configured)?.id ?? o[s];
          }
          return n;
        });
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  // OpenRouter: load its live list of image-capable models the first time it is chosen
  useEffect(() => {
    if (byok.provider !== "openrouter" || openrouterModels) return;
    fetch("/api/bench/byok/models")
      .then((r) => r.json())
      .then((j: { models: { id: string; label: string; free: boolean }[] }) => {
        if (!j.models.length) return setOpenrouterModels([]);
        setOpenrouterModels(j.models.map((m) => ({ id: m.id, label: m.free ? `${m.id} (free)` : m.id })));
        setByokState((b) => (b.provider === "openrouter" && !j.models.some((m) => m.id === b.model) ? { ...b, model: j.models[0].id } : b));
      })
      .catch(() => setOpenrouterModels([]));
  }, [byok.provider, openrouterModels]);

  const byokModels = useMemo(() => {
    const base = byokProvider(byok.provider)?.models ?? [];
    return byok.provider === "openrouter" && openrouterModels?.length ? openrouterModels : base;
  }, [byok.provider, openrouterModels]);
  const byokModelId = (byok.useCustom ? byok.custom : byok.model).trim();
  const byokLabel = byokProvider(byok.provider)?.label ?? byok.provider;
  const byokHasKey = byok.key.trim().length > 0;
  const byokReady = validModelId(byokModelId) && (byokHasKey ? validKey(byok.key.trim()) && byok.status !== "invalid" : Boolean(serverKeys[byok.provider]));

  /** changing provider, model or key invalidates a previous test */
  const setByok = (b: Partial<Byok>) => {
    setByokState((o) => {
      const n = { ...o, ...b };
      if (b.provider && b.provider !== o.provider) {
        n.model = byokProvider(b.provider)?.models[0]?.id ?? "";
        n.useCustom = false;
        n.custom = "";
      }
      if (b.provider !== undefined || b.model !== undefined || b.key !== undefined || b.custom !== undefined || b.useCustom !== undefined) {
        n.status = "untested";
        n.message = "";
      }
      return n;
    });
    // entering a key switches the "Your model" lane on
    if (b.key !== undefined && b.key.trim()) setSelected((o) => ({ ...o, byok: true }));
  };

  async function testKey() {
    const id = ++testId.current;
    const sent = { provider: byok.provider, model: byokModelId, apiKey: byok.key.trim() || undefined };
    setByokState((o) => ({ ...o, status: "testing", message: "" }));
    try {
      const r = await fetch("/api/bench/byok/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sent) });
      const j = await r.json();
      if (id !== testId.current) return;
      setByokState((o) =>
        o.provider === sent.provider && (o.key.trim() || undefined) === sent.apiKey
          ? { ...o, status: j.ok ? "valid" : "invalid", message: j.ok ? `${j.keySource === "server" ? "Server key" : "Key"} works · replied “${j.reply}” in ${(j.ms / 1000).toFixed(1)} s` : j.error }
          : o,
      );
      if (j.ok) setSelected((o) => ({ ...o, byok: true }));
    } catch {
      if (id === testId.current) setByokState((o) => ({ ...o, status: "invalid", message: "Couldn't reach the server." }));
    }
  }

  const slotModels = useCallback((s: Slot) => providers.filter((p) => SLOT_MODELS[s](p.id)), [providers]);
  const laneReady = (s: Slot) => (s === "byok" ? byokReady : slotModels(s).some((p) => p.configured));
  const laneLabel = (s: Slot) => {
    if (s === "byok") return `${byokLabel} · ${byokModels.find((m) => m.id === byokModelId)?.label.replace(" (free)", "") ?? (byokModelId || "no model")}`;
    return slotModels(s).find((m) => m.id === slotModel[s])?.label ?? SLOTS.find((x) => x.slot === s)!.name;
  };
  const laneNote = (s: Slot) => {
    if (s !== "byok") return "";
    if (!validModelId(byokModelId)) return "Choose a model in Model Config";
    if (byokHasKey) return byok.status === "valid" ? "Your key · tested ✓" : byok.status === "invalid" ? "Your key failed the test" : "Your key · not tested yet";
    return serverKeys[byok.provider] ? "No key entered · using the server's key" : "Enter a key in Model Config";
  };

  const setCfg = (c: Partial<Config>) => setCfgState((o) => ({ ...o, ...c }));
  const setSlotModel = (s: Slot, id: string) => setSlotModelState((o) => ({ ...o, [s]: id }));
  const toggle = (s: Slot) => laneReady(s) && setSelected((o) => ({ ...o, [s]: !o[s] }));
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

  const active = SLOTS.filter((s) => selected[s.slot] && laneReady(s.slot));
  const canRun = Boolean(task) && stages.visibility === "done" && !running && active.length > 0;

  async function run() {
    if (!task || !canRun) return;
    const t = task;
    const lanes = active.map((s) => s.slot);
    setRuns(() => bySlot((s) => ({ status: lanes.includes(s) ? "running" : "skipped" })));
    const taskBody = { kind: t.kind, seed: t.seed, objects: t.difficulty.objects, lighting: t.difficulty.lighting };
    await Promise.all(
      lanes.map(async (s) => {
        const isByok = s === "byok";
        const modelId = isByok ? byokModelId : slotModel[s];
        const label = laneLabel(s);
        // the visitor's key travels in this one request body only; it is never stored or logged
        const body = isByok ? { ...taskBody, provider: byok.provider, model: modelId, apiKey: byok.key.trim() || undefined } : { ...taskBody, model: modelId };
        const t0 = performance.now();
        try {
          const res = await fetch("/api/bench/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
          setRuns((o) => ({ ...o, [s]: { status: "done", modelId, label, raw: j.raw, choice: j.choice, correct: j.correct, ms: performance.now() - t0, keySource: j.keySource } }));
        } catch (e) {
          setRuns((o) => ({ ...o, [s]: { status: "failed", modelId, label, error: (e as Error).message, ms: performance.now() - t0 } }));
        }
      }),
    );
  }

  const value: Ctx = {
    cfg, setCfg, task, genError, stages, generating, generate, providers, loaded, slotModels, slotModel, setSlotModel, selected, toggle,
    laneReady, laneLabel, laneNote, runs, running, run, canRun, view3d, setView3d, byok, setByok, byokModels, byokModelId, serverKeys, testKey,
  };
  return <PipelineCtx.Provider value={value}>{children}</PipelineCtx.Provider>;
}
