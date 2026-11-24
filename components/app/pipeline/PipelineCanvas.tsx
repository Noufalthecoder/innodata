"use client";

import "@xyflow/react/dist/style.css";
import dynamic from "next/dynamic";
import { Background, BackgroundVariant, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { useMemo } from "react";
import { nodeTypes } from "./nodes";
import { PipelineProvider, usePipeline, type Status } from "./state";

const SceneViewer3D = dynamic(() => import("../SceneViewer3D"), { ssr: false });

/* two rows, read left to right: generation on top, evaluation below */
const NODES: Node[] = [
  { id: "trigger", type: "trigger", position: { x: 0, y: 30 }, data: {} },
  { id: "scene", type: "scene", position: { x: 320, y: 50 }, data: {} },
  { id: "preview", type: "preview", position: { x: 630, y: 0 }, data: {} },
  { id: "truth", type: "truth", position: { x: 1000, y: 30 }, data: {} },
  { id: "visibility", type: "visibility", position: { x: 10, y: 450 }, data: {} },
  { id: "selector", type: "selector", position: { x: 340, y: 400 }, data: {} },
  { id: "claude", type: "model", position: { x: 680, y: 370 }, data: { slot: "claude" } },
  { id: "gpt", type: "model", position: { x: 680, y: 510 }, data: { slot: "gpt" } },
  { id: "gemini", type: "model", position: { x: 680, y: 650 }, data: { slot: "gemini" } },
  { id: "results", type: "results", position: { x: 1000, y: 470 }, data: {} },
];

const C = { idle: "#3f3f46", live: "#ff8731", done: "#34d399", fail: "#f87171" };

function edge(id: string, source: string, target: string, from: Status, to: Status, extra: Partial<Edge> = {}): Edge {
  const live = to === "running";
  const color = live ? C.live : to === "failed" ? C.fail : from === "done" && to === "done" ? C.done : C.idle;
  return {
    id, source, target, animated: live, type: "default",
    style: { stroke: color, strokeWidth: live ? 2.5 : 2, opacity: to === "skipped" ? 0.35 : 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    ...extra,
  };
}

function Flow() {
  const { stages, runs, task, view3d, setView3d, running, generating } = usePipeline();

  const edges = useMemo<Edge[]>(() => {
    const trig: Status = generating || stages.scene !== "idle" ? "done" : "idle";
    const sel: Status = stages.visibility === "done" ? "done" : "idle";
    return [
      edge("e1", "trigger", "scene", trig, stages.scene),
      edge("e2", "scene", "preview", stages.scene, stages.preview),
      edge("e3", "preview", "truth", stages.preview, stages.truth),
      edge("e4", "truth", "visibility", stages.truth, stages.visibility, { type: "smoothstep" }),
      edge("e5", "visibility", "selector", stages.visibility, sel),
      ...(["claude", "gpt", "gemini"] as const).map((s) => edge(`m-${s}`, "selector", s, sel, runs[s].status)),
      // model -> results: in transit once that model has answered, until every model is back
      ...(["claude", "gpt", "gemini"] as const).map((s) => {
        const st = runs[s].status;
        if (st === "done" || st === "failed") return edge(`r-${s}`, s, "results", "done", running ? "running" : st);
        return edge(`r-${s}`, s, "results", "idle", st === "skipped" ? "skipped" : "idle");
      }),
    ];
  }, [stages, runs, running, generating]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={NODES}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#08090c" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="#2a2c35" />
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
      <Flow />
    </PipelineProvider>
  );
}
