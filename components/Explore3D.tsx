"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/bench/types";
import { Reveal, SectionHead } from "./Section";

const SceneViewer3D = dynamic(() => import("./app/SceneViewer3D"), {
  ssr: false,
  loading: () => <div className="grid aspect-[4/3] place-items-center rounded-lg border border-white/10 bg-black text-sm text-zinc-500">Loading 3D…</div>,
});

const SCENES = [
  { id: "s43", label: "Depth", note: "Dashed lines are the computed camera-to-object distances. The shortest one is the answer." },
  { id: "s34", label: "Stability", note: "Dots mark the centre of mass above each box, over its supporting face. Green means it holds." },
  { id: "s9", label: "Orientation", note: "The arrow is the container's yaw, read straight from the scene numbers." },
  { id: "s20", label: "Position", note: "Every object is tagged. Left-most is decided by projecting each centre through the camera." },
];

export default function Explore3D() {
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const [active, setActive] = useState(SCENES[0].id);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/bench/tasks.json").then((r) => r.json()).then((all: Task[]) => setTasks(new Map(all.map((t) => [t.id, t])))).catch(() => {});
  }, []);
  // only start WebGL when the section is near the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const task = tasks.get(active);
  const scene = SCENES.find((s) => s.id === active)!;

  return (
    <section id="explore" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead
        eyebrow="Explore in 3D"
        title="The same numbers make the picture and the answer"
        sub="On the left is what the model sees: a path-traced render. On the right is the scene rebuilt live from its numbers, with the ground truth drawn in. Drag to orbit, scroll to zoom."
      />
      <Reveal>
        <div ref={ref} className="rounded-xl border border-white/10 bg-[#0e0f13] p-3 sm:p-4">
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Example scenes">
            {SCENES.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={s.id === active}
                onClick={() => setActive(s.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${s.id === active ? "bg-white text-ink" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <figure>
              <div className="relative overflow-hidden rounded-lg border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/bench/images/${active}.jpg`} alt={`Rendered scene ${active}`} className="aspect-[4/3] w-full object-cover" />
                <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur">what the model sees</span>
              </div>
            </figure>
            <figure>
              {visible && task ? (
                <SceneViewer3D key={active} task={task} allowTruth autoRotate />
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-lg border border-white/10 bg-black text-sm text-zinc-500">Loading 3D…</div>
              )}
            </figure>
          </div>
          <div className="mt-4 flex flex-col gap-1 px-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <p className="font-medium text-white">{task?.question ?? " "}</p>
            {task && <p className="shrink-0 text-sm text-emerald-400">Computed answer: {task.options[task.answer]}</p>}
          </div>
          <p className="mt-1 px-1 text-sm text-zinc-500">{scene.note}</p>
        </div>
      </Reveal>
    </section>
  );
}
