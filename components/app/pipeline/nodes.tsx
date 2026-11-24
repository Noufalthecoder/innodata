"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import { BYOK_PROVIDERS, byokProvider, type ByokProvider } from "@/lib/bench/byok";
import { TIER_LABEL, type Kind } from "@/lib/bench/types";
import { SLOTS, usePipeline, type Slot, type Status } from "./state";

/* ---------- shared pieces ---------- */

const ICONS: Record<string, string> = {
  play: "M8 5v14l11-7z",
  cube: "M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.6 3.7L12 11.7 5.4 8 12 4.3ZM5 9.7l6 3.4v6.6l-6-3.4V9.7Zm8 10v-6.6l6-3.4v6.6l-6 3.4Z",
  image: "M4 5h16v14H4V5Zm2 2v8.6l3.5-3.6 2.5 2.5 3.5-4.5L18 14V7H6Zm2.5 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z",
  target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z",
  eye: "M12 5C6.5 5 2.7 9.4 1.5 12c1.2 2.6 5 7 10.5 7s9.3-4.4 10.5-7C21.3 9.4 17.5 5 12 5Zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  sliders: "M4 6h9v2H4V6Zm13 0h3v2h-3v2h-2V4h2v2ZM4 16h3v2H4v-2Zm7 0h9v2h-9v2H9v-6h2v2Zm-7-5h13v2H4v-2Zm15 0h1v2h-1v-2Z",
  spark: "M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7L12 2Zm6 13 1 2.5 2.5 1-2.5 1L18 22l-1-2.5-2.5-1 2.5-1L18 15Z",
  flag: "M5 3h2v18H5V3Zm3 1h11l-2.5 4L19 12H8V4Z",
  key: "M7 14a5 5 0 1 1 4.9-6H22v4h-2v3h-3v-3h-5.1A5 5 0 0 1 7 14Zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
};
function Icon({ name, color }: { name: string; color: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md" style={{ background: `${color}22`, color }}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden>
        <path d={ICONS[name]} />
      </svg>
    </span>
  );
}

export function StatusBadge({ s }: { s: Status }) {
  if (s === "running")
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-accent">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        running
      </span>
    );
  if (s === "done") return <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-400" title="done">✓</span>;
  if (s === "failed") return <span className="grid h-5 w-5 place-items-center rounded-full bg-red-500/15 text-[11px] text-red-400" title="failed">✕</span>;
  if (s === "skipped") return <span className="text-[11px] text-zinc-600">skipped</span>;
  return <span className="h-2 w-2 rounded-full bg-zinc-600" title="idle" />;
}

const handleCls = "!h-3 !w-3 !border-2 !border-[#0b0c10] !bg-zinc-500";

function Shell({
  icon, color, title, sub, status, width = 240, children, inPos = Position.Left, outPos = Position.Right, noIn, noOut, dim,
}: {
  icon: string; color: string; title: string; sub?: string; status: Status; width?: number; children?: React.ReactNode;
  inPos?: Position; outPos?: Position; noIn?: boolean; noOut?: boolean; dim?: boolean;
}) {
  const ring =
    status === "running" ? "border-accent/80 sg-running"
    : status === "failed" ? "border-red-500/60 shadow-[0_0_30px_-6px_rgba(248,113,113,0.45),0_24px_60px_-20px_rgba(0,0,0,0.9)]"
    : status === "done" ? "border-emerald-400/45 shadow-[0_0_34px_-8px_rgba(52,211,153,0.4),0_24px_60px_-20px_rgba(0,0,0,0.9)]"
    : "border-white/10 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]";
  return (
    <div
      className={`relative rounded-xl border bg-gradient-to-b from-[#1b1d26]/95 to-[#101117]/95 text-left backdrop-blur-md transition-[border-color,box-shadow,opacity] duration-300 before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent ${ring} ${dim ? "opacity-45" : ""}`}
      style={{ width }}
    >
      {!noIn && <Handle type="target" position={inPos} className={handleCls} />}
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5">
        <Icon name={icon} color={color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{title}</p>
          {sub && <p className="truncate text-[11px] text-zinc-500">{sub}</p>}
        </div>
        <StatusBadge s={status} />
      </div>
      <div className="px-3 py-2.5 text-[12px] leading-relaxed text-zinc-400">{children}</div>
      {!noOut && <Handle type="source" position={outPos} className={handleCls} />}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3">
    <span className="text-zinc-500">{k}</span>
    <span className="truncate text-right text-zinc-200">{v}</span>
  </div>
);
const select = "nodrag w-full rounded-md border border-white/10 bg-[#0b0c10] px-2 py-1.5 text-[12px] text-white outline-none focus:border-accent/60";

/* ---------- nodes ---------- */

const KINDS: { id: Kind; label: string }[] = [
  { id: "closer", label: "Depth · closest object" },
  { id: "leftmost", label: "Position · left-most" },
  { id: "orientation", label: "Pose · orientation" },
  { id: "stability", label: "Physics · stability" },
];

export function TriggerNode(_: NodeProps) {
  const { cfg, setCfg, generate, generating, running, stages } = usePipeline();
  const objMax = cfg.kind === "stability" ? 4 : 5;
  return (
    <Shell icon="play" color="#ff8731" title="Generate Task" sub="Manual trigger" status={generating ? "running" : stages.scene === "idle" ? "idle" : "done"} noIn width={250}>
      <div className="space-y-2">
        <label className="block">
          <span className="text-[11px] text-zinc-500">Task type</span>
          <select className={select} value={cfg.kind} onChange={(e) => setCfg({ kind: e.target.value as Kind })}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] text-zinc-500">Objects</span>
            <select className={select} value={cfg.kind === "orientation" ? 1 : Math.min(cfg.objects, objMax)} disabled={cfg.kind === "orientation"} onChange={(e) => setCfg({ objects: Number(e.target.value) })}>
              {cfg.kind === "orientation" ? <option value={1}>1</option> : [2, 3, 4, 5].filter((n) => n <= objMax).map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-zinc-500">Lighting</span>
            <select className={select} value={cfg.lighting} onChange={(e) => setCfg({ lighting: e.target.value as "normal" | "dim" })}>
              <option value="normal">Normal</option>
              <option value="dim">Dim</option>
            </select>
          </label>
        </div>
        <button onClick={generate} disabled={generating || running} className="nodrag mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2 text-[13px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50">
          {generating ? "Generating…" : "▶  Generate Task"}
        </button>
      </div>
    </Shell>
  );
}

export function SceneNode(_: NodeProps) {
  const { task, stages, genError } = usePipeline();
  return (
    <Shell icon="cube" color="#a78bfa" title="Scene Generator" sub="Seeded 3D layout" status={stages.scene}>
      {task ? (
        <div className="space-y-1">
          <Row k="Seed" v={<span className="font-mono">{task.seed}</span>} />
          <Row k="Tier" v={TIER_LABEL[task.tier]} />
          <Row k="Objects" v={task.difficulty.objects} />
          <Row k="Lighting" v={task.difficulty.lighting} />
          <Row k="Camera FOV" v={`${task.camera.fov}°`} />
        </div>
      ) : genError ? (
        <p className="text-red-300">{genError}</p>
      ) : (
        <p>{stages.scene === "running" ? "Placing objects and camera from a fresh seed…" : "Waiting for a trigger. Every position and rotation is chosen here, before any pixel is drawn."}</p>
      )}
    </Shell>
  );
}

export function PreviewNode(_: NodeProps) {
  const { task, stages, setView3d } = usePipeline();
  const shown = task && stages.preview !== "idle";
  return (
    <Shell icon="image" color="#38bdf8" title="Rendered Image" sub="What the model sees" status={stages.preview} width={300}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-white/[0.06] bg-[#0b0c10]">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={task.image} alt={task.question} className={`h-full w-full object-cover transition-opacity duration-500 ${stages.preview === "running" ? "opacity-30" : "opacity-100"}`} />
        ) : (
          <div className="grid h-full place-items-center text-[11px] text-zinc-600">No image yet</div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">{task ? `${task.width}×${task.height} · preview renderer` : "960×720"}</span>
        <button onClick={() => setView3d(true)} disabled={!shown || stages.preview === "running"} className="nodrag rounded border border-white/15 px-2 py-0.5 text-[11px] text-zinc-200 hover:border-white/40 disabled:opacity-30">
          Open in 3D
        </button>
      </div>
    </Shell>
  );
}

export function TruthNode(_: NodeProps) {
  const { task, stages } = usePipeline();
  const ready = task && (stages.truth === "done" || stages.truth === "failed");
  return (
    <Shell icon="target" color="#34d399" title="Ground Truth Engine" sub="Arithmetic on the scene numbers" status={stages.truth} width={270} outPos={Position.Bottom}>
      {ready ? (
        <div>
          <p className="text-[12px] text-zinc-300">{task.question}</p>
          <p className="mt-2 rounded-md border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-1.5 text-[12px] font-medium text-emerald-300">
            {String.fromCharCode(65 + task.answer)} · {task.options[task.answer]}
          </p>
          <p className="nowheel mt-2 max-h-16 overflow-y-auto text-[11px] text-zinc-500">{task.explanation}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">Held back · never sent to a model</p>
        </div>
      ) : (
        <p>{stages.truth === "running" ? "Computing the answer from positions, rotations and camera…" : "Computes the answer from numbers alone. No labeller, no judge model."}</p>
      )}
    </Shell>
  );
}

export function VisibilityNode(_: NodeProps) {
  const { task, stages } = usePipeline();
  const ready = task && (stages.visibility === "done" || stages.visibility === "failed");
  return (
    <Shell icon="eye" color="#fbbf24" title="Visibility Check" sub="≥70% visible · in frame · ≥2,500 px" status={stages.visibility} width={260} inPos={Position.Top}>
      {ready ? (
        <ul className="space-y-1">
          {task.visibility.map((v) => (
            <li key={v.object} className="flex items-center justify-between gap-2">
              <span className="truncate text-zinc-300">{v.object}</span>
              <span className={`shrink-0 font-mono text-[11px] ${v.ok ? "text-emerald-400" : "text-red-400"}`}>
                {v.visiblePct}% · {v.pixels.toLocaleString()}px {v.ok ? "✓" : "✕"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>{stages.visibility === "running" ? "Counting each object's visible pixels…" : "Proves the question is answerable from the image."}</p>
      )}
    </Shell>
  );
}

export function SelectorNode(_: NodeProps) {
  const { slotModels, selected, toggle, slotModel, setSlotModel, run, canRun, running, task, loaded, laneReady, laneNote, laneLabel } = usePipeline();
  return (
    <Shell icon="sliders" color="#f472b6" title="Model Selector" sub="Choose who takes the test" status={running ? "running" : "idle"} width={260}>
      <div className="space-y-2">
        {SLOTS.map((s) => {
          const models = slotModels(s.slot);
          const configured = laneReady(s.slot);
          const isByok = s.slot === "byok";
          if (!loaded) return <div key={s.slot} className="h-9 animate-pulse rounded-md bg-white/[0.04]" />;
          return (
            <div key={s.slot} className={`rounded-md border border-white/[0.06] bg-[#0b0c10] px-2 py-1.5 ${configured ? "" : "opacity-50"}`}>
              <div className="nodrag flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12px] text-zinc-200">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                  <span className="text-[10px] text-zinc-500">{s.vendor}</span>
                </span>
                <button
                  role="switch"
                  aria-checked={selected[s.slot]}
                  aria-label={`Run ${s.name}`}
                  disabled={!configured || running}
                  onClick={() => toggle(s.slot)}
                  className={`relative h-4 w-7 rounded-full transition-colors ${selected[s.slot] ? "bg-accent" : "bg-zinc-700"}`}
                >
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${selected[s.slot] ? "left-3.5" : "left-0.5"}`} />
                </button>
              </div>
              {isByok ? (
                <p className={`mt-0.5 truncate text-[10px] ${configured ? "text-emerald-400/80" : "text-zinc-500"}`}>{configured ? `${laneLabel("byok")} · ${laneNote("byok")}` : laneNote("byok")}</p>
              ) : (
                !configured && <p className="mt-0.5 text-[10px] text-zinc-500">No {s.envVar} on the server</p>
              )}
              {!isByok && configured && models.length > 1 && (
                <select className={`${select} mt-1.5 py-1`} value={slotModel[s.slot]} disabled={running} onChange={(e) => setSlotModel(s.slot, e.target.value)}>
                  {models.filter((m) => m.configured).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              )}
            </div>
          );
        })}
        <button onClick={run} disabled={!canRun} className="nodrag mt-1 w-full rounded-md bg-white py-2 text-[13px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-30">
          {running ? "Running…" : "▶  Run"}
        </button>
        {!task && <p className="text-center text-[10px] text-zinc-600">Generate a task first</p>}
      </div>
    </Shell>
  );
}

export function ModelNode({ data }: NodeProps) {
  const slot = (data as { slot: Slot }).slot;
  const meta = SLOTS.find((s) => s.slot === slot)!;
  const { runs, task, selected, loaded, laneReady, laneLabel, laneNote } = usePipeline();
  const r = runs[slot];
  const configured = laneReady(slot);
  const label = laneLabel(slot);
  return (
    <Shell icon="spark" color={meta.color} title={meta.name} sub={!loaded ? "Checking…" : configured ? label : "Not configured"} status={r.status} width={250} dim={loaded && (!configured || (!selected[slot] && r.status === "idle"))}>
      {r.status === "running" && <p>Image + question sent… awaiting reply</p>}
      {r.status === "done" && task && (
        <div>
          <p className="text-zinc-200">
            Answered <span className="font-mono font-semibold">{r.choice === null || r.choice === undefined ? "?" : String.fromCharCode(65 + r.choice)}</span>
            {r.choice !== null && r.choice !== undefined && <span className="text-zinc-400"> · {task.options[r.choice]}</span>}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            {((r.ms ?? 0) / 1000).toFixed(1)} s{r.keySource === "user" ? " · your key" : ""} · raw “{(r.raw ?? "").trim().slice(-30)}”
          </p>
        </div>
      )}
      {r.status === "failed" && <p className="line-clamp-2 text-red-300">{r.error}</p>}
      {r.status === "skipped" && <p>Not selected for this run.</p>}
      {r.status === "idle" && (
        <p>
          {!loaded
            ? "Checking server keys…"
            : slot === "byok"
              ? laneNote(slot)
              : configured
                ? selected[slot] ? "Ready" : "Off. Toggle it on in the selector."
                : `Add ${meta.envVar} to .env.local to enable.`}
        </p>
      )}
    </Shell>
  );
}

export function ResultsNode(_: NodeProps) {
  const { runs, task, running } = usePipeline();
  const ran = SLOTS.filter((s) => runs[s.slot].status === "done" || runs[s.slot].status === "failed");
  const answered = ran.filter((s) => runs[s.slot].status === "done");
  const correct = answered.filter((s) => runs[s.slot].correct).length;
  const status: Status = running ? "running" : ran.length ? "done" : "idle";
  return (
    <Shell icon="flag" color="#ff8731" title="Results" sub="Scored against computed truth" status={status} width={300} noOut>
      {ran.length && task ? (
        <div>
          {answered.length > 0 && (
            <p className="mb-2 text-[22px] font-semibold tracking-tight text-white">
              {correct}/{answered.length} <span className="text-[12px] font-normal text-zinc-500">correct</span>
            </p>
          )}
          <ul className="space-y-1.5">
            {ran.map((s) => {
              const r = runs[s.slot];
              return (
                <li key={s.slot} className="flex items-center justify-between gap-2 rounded-md bg-[#0b0c10] px-2 py-1.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="truncate text-zinc-200">{r.label}</span>
                  </span>
                  {r.status === "failed" ? (
                    <span className="shrink-0 text-red-400">error</span>
                  ) : (
                    <span className={`shrink-0 font-medium ${r.correct ? "text-emerald-400" : "text-red-400"}`}>
                      {r.choice === null || r.choice === undefined ? "no answer" : String.fromCharCode(65 + r.choice)} {r.correct ? "✓" : "✕"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] text-zinc-500">
            Truth: <span className="text-emerald-400">{String.fromCharCode(65 + task.answer)} · {task.options[task.answer]}</span>
          </p>
        </div>
      ) : (
        <p>{running ? "Waiting for model replies…" : "Each model's answer, scored automatically, appears here."}</p>
      )}
    </Shell>
  );
}

/** Step 1: Bring Your Own Key. The key lives in this component tree's memory only. */
export function ConfigNode(_: NodeProps) {
  const { byok, setByok, byokModels, byokModelId, serverKeys, testKey, running } = usePipeline();
  const [show, setShow] = useState(false);
  const meta = byokProvider(byok.provider)!;
  const hasKey = byok.key.trim().length > 0;
  const status = byok.status === "testing" ? "running" : byok.status === "valid" ? "done" : byok.status === "invalid" ? "failed" : "idle";
  const pill =
    byok.status === "valid" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : byok.status === "invalid" ? "border-red-500/30 bg-red-500/10 text-red-300"
    : byok.status === "testing" ? "border-accent/30 bg-accent/10 text-accent"
    : "border-white/10 bg-white/[0.03] text-zinc-400";
  return (
    <Shell icon="key" color="#10a37f" title="Model Config" sub="Step 1 · bring your own key (optional)" status={status as Status} width={300} noIn>
      <div className="space-y-2">
        <div className="grid grid-cols-[0.75fr_1.25fr] gap-2">
          <label className="block">
            <span className="text-[11px] text-zinc-500">Provider</span>
            <select className={select} value={byok.provider} disabled={running} onChange={(e) => setByok({ provider: e.target.value as ByokProvider })}>
              {BYOK_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-zinc-500">Model</span>
            <select
              className={select}
              value={byok.useCustom ? "__custom" : byok.model}
              disabled={running}
              onChange={(e) => (e.target.value === "__custom" ? setByok({ useCustom: true }) : setByok({ model: e.target.value, useCustom: false }))}
            >
              {byokModels.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              <option value="__custom">Custom model id…</option>
            </select>
          </label>
        </div>
        {byok.useCustom && (
          <input
            className={`${select} font-mono`}
            placeholder="exact model id, e.g. gpt-4.1"
            value={byok.custom}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setByok({ custom: e.target.value })}
          />
        )}
        <label className="block">
          <span className="flex items-center justify-between text-[11px] text-zinc-500">
            API key
            <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="nodrag text-zinc-500 underline-offset-2 hover:text-white hover:underline">get a key ↗</a>
          </span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className={`${select} pr-14 font-mono`}
              placeholder={serverKeys[byok.provider] ? `optional · ${meta.keyHint}` : meta.keyHint}
              value={byok.key}
              onChange={(e) => setByok({ key: e.target.value })}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="byok-key"
              data-1p-ignore
              data-lpignore="true"
              aria-label={`${meta.label} API key`}
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="nodrag absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/10 hover:text-white" aria-label={show ? "Hide key" : "Show key"}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={testKey}
            disabled={byok.status === "testing" || !byokModelId || (!hasKey && !serverKeys[byok.provider])}
            className="nodrag rounded-md border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:border-white/40 disabled:opacity-30"
          >
            {byok.status === "testing" ? "Testing…" : "Test Key"}
          </button>
          {hasKey && (
            <button onClick={() => setByok({ key: "" })} className="nodrag text-[11px] text-zinc-500 hover:text-white">
              Clear
            </button>
          )}
          <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${pill}`}>
            {byok.status === "valid" ? "valid" : byok.status === "invalid" ? "invalid" : byok.status === "testing" ? "testing" : hasKey ? "untested" : serverKeys[byok.provider] ? "server key" : "no key"}
          </span>
        </div>
        {byok.message && <p className={`text-[11px] leading-snug ${byok.status === "valid" ? "text-emerald-300/90" : "text-red-300"}`}>{byok.message}</p>}
        <p className="text-[10px] leading-snug text-zinc-600">Kept in this tab&apos;s memory only. Never saved, logged or stored. A refresh clears it.</p>
      </div>
    </Shell>
  );
}

export const nodeTypes = {
  config: ConfigNode,
  trigger: TriggerNode,
  scene: SceneNode,
  preview: PreviewNode,
  truth: TruthNode,
  visibility: VisibilityNode,
  selector: SelectorNode,
  model: ModelNode,
  results: ResultsNode,
};
