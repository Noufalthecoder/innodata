export const GITHUB_URL = "https://github.com/Noufalthecoder/innodata";
export const CONTACT_EMAIL = "hello@example.com"; // TODO: replace
export const TEAM_NAME = "Team SpatialGrid"; // TODO: replace
export const DEADLINE_ISO = "2026-12-06T23:59:59"; // TODO: confirm submission deadline

export const navLinks = [
  { href: "#about", label: "About" },
  { href: "#why", label: "Why it matters" },
  { href: "#how", label: "How it works" },
  { href: "#tiers", label: "Tiers" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#results", label: "Results" },
  { href: "#faq", label: "FAQs" },
];

export const badges = [
  { value: "3", label: "Difficulty tiers" },
  { value: "100%", label: "Auto-verified answers" },
  { value: "0", label: "Human or AI graders" },
  { value: "2–5", label: "Objects per scene" },
];

export const aboutParagraphs = [
  "SpatialGrid is a procedurally generated benchmark that tests whether vision AI models truly understand space: where things are, how they are turned, what is in front of what, and whether a stack is about to fall.",
  "We build simple 3D scenes where we control every object's position and rotation. Because we place everything ourselves, the correct answer is basic math on numbers we already hold, never a guess and never another AI's opinion.",
  "Every question passes a visibility check first. If the evidence is not in the image, the question is never asked.",
];

export const why = [
  { title: "Robots need depth", body: "Misjudge which object is closer and a robot arm grabs the wrong thing, or hits something it never saw." },
  { title: "Grippers need pose", body: "If a model cannot read orientation, a robot cannot grip. 6-DoF pose is the core of robotic manipulation." },
  { title: "Inspection needs physics", body: "Spotting an unstable stack before it topples is a safety job, not a quiz question." },
  { title: "Trust needs ground truth", body: "Answers come from our own scene data, so the benchmark can be re-derived and audited by anyone." },
];

export const steps = [
  {
    title: "Generate a scene",
    body: "Place 2–5 primitive 3D objects at positions and rotations we choose and record. Every number is known before a pixel is drawn."
  },
  {
    title: "Ask the AI a question",
    body: "Render the scene, run the visibility check so only answerable questions survive, then send image + templated question to GPT-4V, Gemini or Claude."
  },
  {
    title: "Verify the answer",
    body: "Answers are compared to ground truth computed from our own scene data: no human grader and no AI judge. Every sample can be re-derived from scratch."
  },
];

export const tiers = [
  { n: "01", tag: "Tier 1 · Pose", title: "Read one object's orientation", body: "Which way is this box's open side facing? Reads a single object's position and direction.", example: "Which way is the open side facing?" },
  { n: "02", tag: "Tier 2 · Relative", title: "Compare objects in space", body: "Is the cylinder in front of or behind the box? Compares two or more objects.", example: "Which object is closer to the camera?" },
  { n: "03", tag: "Tier 3 · Plausibility", title: "Judge physical stability", body: "Will this stack stand or fall? Decided by a centre-of-mass over base-of-support rule we can show in one line of code.", example: "Is this stack stable?" },
  { n: "04", tag: "Modifier · Clutter", title: "More objects, more confusion", body: "Scenes scale from 2 to 5 objects, so difficulty comes from real visual complexity.", example: "Same question, denser scene." },
  { n: "05", tag: "Modifier · Occlusion", title: "Things block each other", body: "Objects partly hide one another. The visibility check keeps only questions the image can answer.", example: "Box in front, cone behind." },
  { n: "06", tag: "Modifier · Lighting", title: "Light and shadow change", body: "Lighting varies per scene, so models cannot rely on one easy rendering style.", example: "Same scene, different light." },
];

export const roadmap = [
  { date: "Phase 1", title: "Scene generation + rendering", body: "2–3 objects, end-to-end pipeline on the simplest case." },
  { date: "Phase 2", title: "Ground truth + Tier 1/2 questions", body: "Distance, direction and pose extracted from placed objects; templates tested." },
  { date: "Phase 3", title: "Visibility check", body: "Occlusion, frame-edge and size checks gate every question." },
  { date: "Phase 4", title: "Model evaluation", body: "Run GPT-4V, Gemini and Claude across the generated set." },
  { date: "Phase 5", title: "Tier 3 stability", body: "Centre-of-mass rule added once Tiers 1 and 2 are submission-ready." },
  { date: "Phase 6", title: "Results", body: "Accuracy by tier and difficulty, plus the scenes every model got wrong." },
  { date: "Dec 6", title: "Submission", body: "Repo, sample outputs, validation evidence, write-up and demo." },
];

export const deliverables = [
  { title: "Runnable source code", body: "Scene generator, question generator and model-evaluation script with a clear README." },
  { title: "Sample outputs", body: "Generated images with their question, answer and ground-truth JSON." },
  { title: "Validation evidence", body: "A script that re-derives a sample of answers from scratch, plus the stability rule explained." },
  { title: "Demo and write-up", body: "Short deck and walkthrough covering the pipeline and findings." },
];

// Sample questions. Replace "status" with measured accuracy once the benchmark run is done.
export const samples = [
  { tier: "Tier 1 · Pose", q: "Which way is the open side of this box facing?", truth: "Computed from the box's recorded rotation", status: "Pending run" },
  { tier: "Tier 2 · Relative", q: "Which object is closer to the camera, the red box or the blue cylinder?", truth: "Computed from camera-space depth of each object", status: "Pending run" },
  { tier: "Tier 2 · Relative", q: "Is the cylinder in front of or behind the box?", truth: "Computed from recorded positions", status: "Pending run" },
  { tier: "Tier 3 · Plausibility", q: "Is this stack of boxes stable, or will it fall?", truth: "Centre of mass over base of support", status: "Pending run" },
];

export const faqs = [
  { q: "Why synthetic scenes instead of real photos?", a: "Because we place every object, we know the exact answer before rendering. Real photos need a human or a model to label them, which brings back the very uncertainty we want to remove." },
  { q: "How are answers verified?", a: "From the numbers we generated: object position, rotation and distance. Never from a person looking at the image and never from another AI. A script re-derives a sample from scratch as proof." },
  { q: "What stops unanswerable questions?", a: "A visibility check after rendering. If the object we want to ask about is occluded, cropped by the frame or too small, we ask about something else or discard the scene." },
  { q: "How is stability decided?", a: "A simple rule: the stack is stable if its centre of mass lies over the base of support. It is one line of code and fully reproducible, with no physics engine to debug." },
  { q: "Which models are tested?", a: "GPT-4V, Gemini and Claude vision models, through the hackathon-provided AI credits." },
  { q: "Is the code open?", a: "Yes. The runnable source is on GitHub, with sample outputs and the validation script." },
];
