// Narration for the demo video. s0 plays over the team's 30-second explainer (demo-output/intro.mp4);
// s1..s8 play over the live recording of the site and app. The findings line is built from summary.json.
import { readFileSync } from "node:fs";

const LABEL = {
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemma-4-26b-a4b-it": "Gemma 4",
  "@cf/qwen/qwen3.8-27b": "Alibaba's Qwen",
  "@cf/mistralai/mistral-small-3.1-24b-instruct": "Mistral",
  "@cf/meta/llama-4-scout-17b-16e-instruct": "Meta's Llama 4",
};

function findings() {
  const s = JSON.parse(readFileSync("public/bench/summary.json", "utf8"));
  const ms = s.models.slice().sort((a, b) => b.overall.accuracy - a.overall.accuracy);
  const top = ms[0];
  return `Six models, from four companies. ${LABEL[top.model] ?? top.model} scored highest, at ${Math.round(top.overall.accuracy * 100)} percent. Depth and position are nearly solved. Orientation is broken for every model: they almost never answer left or right. And Google's models call safe stacks unsafe, while Qwen, Mistral and Llama get them right.`;
}

export function buildSegments() {
  return [
    {
      id: "s0",
      text: "Vision models can see objects. But do they understand space: what is nearer, how it is turned, whether a stack will hold? Today, tests use hand-labelled photos, or AI-generated images, and there is no way to prove the answer is right. So we build the scene ourselves. We place every object, so we already know the answer.",
    },
    { id: "s1", text: "This is SpatialGrid, from team Hackcrew: a benchmark factory for physical AI, where every answer is computed before the image exists." },
    { id: "s2", text: "Here is one real scene. Three Google models say this stack falls. Alibaba, Mistral and Meta say it stands. The computed answer: it stands, with at least twelve centimetres to spare." },
    {
      id: "s3",
      text: "The app is the pipeline itself. Generate a task, and each stage fills in with real output: the scene from its seed, the photoreal image, the answer computed from geometry, and a pixel-level check that proves the question is answerable.",
    },
    {
      id: "s4",
      text: "Then only the image and the question, never the answer, go to four AI companies at once. Judges can add their own model here, with their own key. It stays in memory, and is never stored.",
    },
    { id: "s5", text: "Each lane reports back live, and every answer is scored automatically against the computed truth." },
    {
      id: "s6",
      text: "Validation is independent of every model. Separate code re-derives all sixty answers, every task rebuilds from its seed, every image passes the visibility check, and a hundred and sixteen automated tests run on every push.",
    },
    { id: "s7", text: findings() },
    {
      id: "s9",
      text: "And here is the dataset: all sixty photoreal tasks, filterable by skill. Open any task, and it is rebuilt in 3D from the same numbers that made the image, with the ground truth drawn in: the distance from the camera to every object, and the nearest one marked.",
    },
    { id: "s8", text: "SpatialGrid, by team Hackcrew. Labels that can't be wrong. Any number of tasks. Zero annotators. The code is open on GitHub." },
  ];
}
