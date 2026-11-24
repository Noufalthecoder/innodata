"use client";

import "@xyflow/react/dist/style.css";
import dynamic from "next/dynamic";
import { Controls, MarkerType, ReactFlow, ReactFlowProvider, useNodesState, useNodesInitialized, useReactFlow, type Edge, type Node } from "@xyflow/react";
import { useEffect, useMemo, useRef } from "react";
import { nodeTypes } from "./nodes";
import { PipelineProvider, SLOTS, usePipeline, type Status } from "./state";

const SceneViewer3D = dynamic(() => import("../SceneViewer3D"), { ssr: false });

/* two rows, read left to right: generation on top, evaluation below. Base layout is ~1300 x 770. */
const BASE: Node[] = [
  { id: "trigger", type: "trigger", position: { x: 0, y: 30 }, data: {} },
  { id: "scene", type: "scene", position: { x: 320, y: 45 }, data: {} },
  { id: "preview", type: "preview", position: { x: 630, y: 0 }, data: {} },
  { id: "truth", type: "truth", position: { x: 1000, y: 30 }, data: {} },
  { id: "visibility", type: "visibility", position: { x: 10, y: 440 }, data: {} },
  // step 1 for visitors: their own model and key, feeding the selector
  { id: "config", type: "config", position: { x: 0, y: 650 }, data: {} },
  { id: "selector", type: "selector", position: { x: 340, y: 440 }, data: {} },
  // one model lane per company, stacked
  ...SLOTS.map((s, i) => ({ id: s.slot, type: "model", position: { x: 680, y: 400 + i * 116 }, data: { slot: s.slot } })),
  { id: "results", type: "results", position: { x: 1000, y: 560 }, data: {} },
];
const BASE_W = 1300, BASE_H = 1040;
/** stretch the columns so the graph has the same shape as the screen, so it can be zoomed to fill it */
const layout = (k: number) => BASE.map((n) => ({ ...n, position: { x: n.position.x * k, y: n.position.y } }));

const C = { idle: "#3f3f46", live: "#ff8731", done: "#34d399", fail: "#f87171" };

function edge(id: string, source: string, target: string, from: Status, to: Status, extra: Partial<Edge> = {}): Edge {
  const live = to === "running";
  const color = live ? C.live : to === "failed" ? C.fail : from === "done" && to === "done" ? C.done : C.idle;
  return {
    id, source, target, animated: live, type: "default",
    className: live ? "sg-live" : color === C.done ? "sg-done" : color === C.fail ? "sg-fail" : "",
    style: { stroke: color, strokeWidth: live ? 3 : 2.2, opacity: to === "skipped" ? 0.35 : 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    ...extra,
  };
}

function Flow() {
  const { stages, runs, task, view3d, setView3d, running, generating, loaded, byok } = usePipeline();
  const wrap = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout(1));
  const { fitView } = useReactFlow();
  const nodesReady = useNodesInitialized();

  // fill the screen: re-layout and re-fit whenever the canvas changes size
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let raf = 0;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const k = Math.min(1.7, Math.max(1, (width / height) * (BASE_H / BASE_W)));
      setNodes(layout(k));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => requestAnimationFrame(() => fitView({ padding: 0.06, maxZoom: 1.8, duration: 250 })));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [fitView, setNodes]);

  // nodes grow when they fill with results; keep the whole graph in view
  const settled = !generating && !running;
  useEffect(() => {
    if (!settled) return;
    const t = setTimeout(() => fitView({ padding: 0.06, maxZoom: 1.8, duration: 400 }), 120);
    return () => clearTimeout(t);
  }, [settled, task, nodesReady, loaded, fitView]);

  const edges = useMemo<Edge[]>(() => {
    const trig: Status = generating || stages.scene !== "idle" ? "done" : "idle";
    const sel: Status = stages.visibility === "done" ? "done" : "idle";
    return [
      edge("e1", "trigger", "scene", trig, stages.scene),
      edge("e2", "scene", "preview", stages.scene, stages.preview),
      edge("e3", "preview", "truth", stages.preview, stages.truth),
      edge("e4", "truth", "visibility", stages.truth, stages.visibility, { type: "smoothstep" }),
      edge("e5", "visibility", "selector", stages.visibility, sel),
      edge("e-cfg", "config", "selector", byok.status === "valid" ? "done" : "idle", byok.status === "testing" ? "running" : byok.status === "valid" ? "done" : byok.status === "invalid" ? "failed" : "idle"),
      ...SLOTS.map(({ slot: s }) => edge(`m-${s}`, "selector", s, sel, runs[s].status)),
      // model -> results: in transit once that model has answered, until every model is back
      ...SLOTS.map(({ slot: s }) => {
        const st = runs[s].status;
        if (st === "done" || st === "failed") return edge(`r-${s}`, s, "results", "done", running ? "running" : st);
        return edge(`r-${s}`, s, "results", "idle", st === "skipped" ? "skipped" : "idle");
      }),
    ];
  }, [stages, runs, running, generating, byok.status]);

  return (
    <div ref={wrap} className="sg-canvas relative h-full w-full overflow-hidden">
      {/* depth: a perspective floor grid receding to a glowing horizon */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[45%] bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(255,135,49,0.10),transparent_70%)]" />
        <div className="absolute inset-x-0 top-[44%] h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="sg-floor-wrap absolute inset-x-0 bottom-0 top-[44%]">
          <div className="sg-floor" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65))]" />
      </div>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.06, maxZoom: 1.8 }}
        minZoom={0.25}
        maxZoom={2}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {view3d && task && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-6 backdrop-blur-sm" onClick={() => setView3d(false)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-white">{task.question}</p>
              <button onClick={() => setView3d(false)} className="rounded-md border border-white/20 px-3 py-1 text-sm text-white hover:border-white/50">
                Close
              </button>
            </div>
            <SceneViewer3D task={task} allowTruth autoRotate />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelineCanvas() {
  return (
    <PipelineProvider>
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </PipelineProvider>
  );
}
