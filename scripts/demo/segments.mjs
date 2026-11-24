// Narration for the demo video. The findings segment is written from the real results in public/bench/summary.json.
import { readFileSync } from "node:fs";

const LABEL = {
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemini-3-flash-preview": "Gemini 3 Flash",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemma-4-26b-a4b-it": "Gemma 4",
  "@cf/qwen/qwen3.8-27b": "Alibaba's Qwen",
  "@cf/mistralai/mistral-small-3.1-24b-instruct": "Mistral",
  "@cf/meta/llama-4-scout-17b-16e-instruct": "Meta's Llama 4",
};
const pct = (a) => `${Math.round(a * 100)} percent`;
// insight sentences below were read from the results of the shipped 60-task dataset (see docs/TECHNICAL_REPORT.md)

function findings() {
  const s = JSON.parse(readFileSync("public/bench/summary.json", "utf8"));
  const ms = s.models.slice().sort((a, b) => b.overall.accuracy - a.overall.accuracy);
  if (!ms.length) return "Model results will appear here once the evaluation has run.";
  const list = ms.map((m) => `${LABEL[m.model] ?? m.model}, ${pct(m.overall.accuracy)}`);
  const said = list.length > 1 ? `${list.slice(0, -1).join(", ")}, and ${list.at(-1)}` : list[0];
  return `And the findings. Six models from four companies, on ${s.taskCount} tasks. ${LABEL[ms[0].model] ?? ms[0].model} leads at ${pct(ms[0].overall.accuracy)}. Depth and position are nearly solved. Orientation is weak for every model: they almost never answer left or right. And on stability, Google's models call safe stacks unsafe, while Qwen, Mistral and Llama get them right.`;
}

export function buildSegments() {
  return [
    { id: "s0", text: "SpatialGrid. Before a robot reaches, it has to see. This benchmark tests whether AI vision models can be trusted to act in the physical world." },
    { id: "s1", text: "Robots and inspection cameras must know which object is closer, how it is turned, and whether a stack will fall. When a vision model gets this wrong, a robot collides, or a pallet topples. SpatialGrid measures exactly these skills." },
    { id: "s2", text: "Every scene is generated from numbers we choose: object positions, rotations, and the camera. Blender renders it photo-realistically, under real studio and workshop lighting. Because we placed every object, we already know the answer." },
    { id: "s3", text: "Here is the same scene in 3D. The ground truth is drawn from those same numbers: the distance from the camera to every object. No person, and no AI, decides what is correct." },
    { id: "s4", text: "Every question must be answerable from the image. We count each object's visible pixels, against the object on its own. Hidden, cut-off, or tiny objects are rejected, and the task is rebuilt." },
    { id: "s5", text: "Four kinds of reasoning, across three tiers: depth, position, orientation, and physical stability. Object count, occlusion, lighting, and materials all vary." },
    { id: "s6", text: "Anyone can answer the same questions the models get. Or generate a brand-new scene on demand, with its answer computed instantly." },
    { id: "s7", text: "Validation is independent of every model. Separate code re-derives all sixty answers, every task rebuilds identically from its seed, and every task passes the visibility check. Eighty-five automated tests run on every push." },
    { id: "s8", text: findings() },
    { id: "s9", text: "SpatialGrid. A reusable generator, verified answers, and honest results. The code is open on GitHub." },
  ];
}
