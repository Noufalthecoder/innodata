export const GITHUB_URL = "https://github.com/Noufalthecoder/innodata";
export const REPORT_URL = `${GITHUB_URL}/blob/main/docs/TECHNICAL_REPORT.md`;
export const CONTACT_EMAIL = "hello@example.com"; // TODO: replace
export const TEAM_NAME = "Team SpatialGrid"; // TODO: replace

export const navLinks = [
  { href: "#problem", label: "Problem" },
  { href: "#findings", label: "Findings" },
  { href: "#how", label: "How it works" },
  { href: "#tasks", label: "Tasks" },
  { href: "#explore", label: "3D" },
  { href: "#app", label: "App" },
  { href: "#results", label: "Leaderboard" },
  { href: "#faq", label: "FAQ" },
];

/** the scene on the hero card: a stable stack that every evaluated model called unstable */
/** the scene on the hero card: a stable stack that splits the models into two camps */
export const heroCase = {
  image: "/bench/images/s34.jpg",
  id: "s34",
  question: "Will this stack of 4 boxes stay standing, or will it fall?",
  truth: "Stays standing",
  why: "Each box's load sits over the box below it, with at least 12 cm to spare. All three Google models said it falls.",
  answers: [
    { model: "Gemini 3.1 Flash-Lite", vendor: "Google", said: "Falls", ok: false },
    { model: "Gemini 3.5 Flash-Lite", vendor: "Google", said: "Falls", ok: false },
    { model: "Gemma 4 26B", vendor: "Google", said: "Falls", ok: false },
    { model: "Qwen3.8 27B", vendor: "Alibaba", said: "Stands", ok: true },
    { model: "Mistral Small 3.1", vendor: "Mistral AI", said: "Stands", ok: true },
    { model: "Llama 4 Scout", vendor: "Meta", said: "Stands", ok: true },
  ],
};

export const stats = [
  { value: "60", label: "Photoreal test scenes" },
  { value: "60 / 60", label: "Answers re-derived independently" },
  { value: "85", label: "Automated tests in CI" },
  { value: "6", label: "Vision models, 4 companies" },
];

export const problem = {
  lead: "Vision-language models are being wired into robot arms, warehouse pickers and inspection cameras. Most benchmarks check whether a model can describe a picture. SpatialGrid checks whether it can be trusted to act on one.",
  failures: [
    { skill: "Depth", question: "Which item is nearest?", cost: "The arm reaches for the wrong item, or hits one it never saw." },
    { skill: "Pose", question: "Which way is it turned?", cost: "The gripper approaches from the closed side and the grasp fails." },
    { skill: "Stability", question: "Will this stack hold?", cost: "An unsafe pallet is passed as safe, or a safe one halts the line." },
  ],
};

export const findings = [
  { value: "90%", label: "Depth and position", body: "Average across six models on “closest to the camera” and “furthest left”, with up to five objects and partial occlusion. Nearly solved; Llama 4 is the exception at 67%.", tone: "good" },
  { value: "43%", label: "Orientation", body: "Average across six models from four companies, against 25% for guessing. Out of 60 answers, only one said left or right, although 4 of the 10 tasks need it.", tone: "bad" },
  { value: "1–6 vs 10", label: "Stable stacks recognised, of 10", body: "Google's three models called most stable stacks unsafe. Qwen, Mistral and Llama recognised all ten. Over-predicting collapse is a model-family habit, not a universal one.", tone: "bad" },
] as const;

export const pipeline = [
  { title: "Choose the numbers", body: "A seed sets every object's shape, position, rotation and the camera. Nothing is drawn yet." },
  { title: "Render the scene", body: "Blender path-traces it under real studio and workshop lighting, on realistic floors." },
  { title: "Prove it is visible", body: "Each object is re-rendered as a flat-colour mask. Under 70% visible, cut off or too small: the task is rebuilt." },
  { title: "Compute the answer", body: "Distance, projection, rotation or centre of mass, from the numbers alone. No labeller, no judge model." },
  { title: "Score the model", body: "Image and question go to the model; a strict parser reads its letter and scores it against the computed truth." },
];

export const taskTypes = [
  { tier: "Tier 1 · Pose", title: "Orientation", image: "/bench/images/s9.jpg", question: "The open side of this container faces which way?", rule: "Read from the container's yaw angle." },
  { tier: "Tier 2 · Relative", title: "Depth", image: "/bench/images/s43.jpg", question: "Which object is closest to the camera?", rule: "Smallest camera-to-object distance, by a 0.8 m margin." },
  { tier: "Tier 2 · Relative", title: "Position", image: "/bench/images/s20.jpg", question: "Which object appears furthest to the left?", rule: "Smallest x after perspective projection, by 90 px." },
  { tier: "Tier 3 · Physics", title: "Stability", image: "/bench/images/s4.jpg", question: "Will this stack stay standing, or fall?", rule: "Centre of mass over each supporting face, by 12 cm." },
];

export const variation = ["1–5 objects", "Partial occlusion", "Normal and dim light", "6 real-world HDRI environments", "5 floor materials", "Matte, plastic and metal", "2–4 box stacks", "Balanced outcomes"];

export const faqs = [
  { q: "Why synthetic scenes instead of photos?", a: "Because we place every object, the correct answer is arithmetic on numbers we already hold. Real photos need a person or a model to label them, which brings back the uncertainty we want to remove. Path-traced lighting keeps the images realistic." },
  { q: "How do you know every answer is right?", a: "Separate code that shares no logic with the generator re-derives all 60 answers from the raw scene numbers, every task rebuilds identically from its seed, and 85 automated tests run on every push." },
  { q: "What stops unanswerable questions?", a: "A visibility check after rendering. Each object must be at least 70% unoccluded, fully in frame and at least 2,500 pixels. Otherwise the scene is discarded and rebuilt from a new seed." },
  { q: "How is stability decided?", a: "For every box, the centre of mass of everything above it must sit over that box's top face. Tasks are kept only when the margin is at least 12 cm, so no case is borderline." },
  { q: "Which models were tested?", a: "Six models from four companies: Gemini 3.1 Flash-Lite, Gemini 3.5 Flash-Lite and Gemma 4 26B (Google), Qwen3.8 27B (Alibaba), Mistral Small 3.1 24B (Mistral AI) and Llama 4 Scout 17B (Meta). Claude and GPT-4o are supported by the code but were not run, and we report only what we actually ran." },
  { q: "Can I generate more tasks?", a: "Yes. The generator produces any number of tasks from a seed. One command renders, validates and writes them, and the app can build new scenes on demand." },
];

export const appFeatures = [
  { id: "", title: "Pipeline", body: "One node-based canvas: generate a scene, watch ground truth and visibility compute, then run Gemini, Llama, Mistral and Qwen side by side." },
  { id: "dataset", title: "Dataset", body: "Browse the 60 photoreal tasks, in render or interactive 3D, with the truth drawn on the scene." },
  { id: "validation", title: "Validation Proof", body: "Re-derive every answer with independent code and rebuild tasks from their seeds." },
  { id: "leaderboard", title: "Leaderboard", body: "Accuracy by tier, task type and lighting, and the scenes every model got wrong." },
];
