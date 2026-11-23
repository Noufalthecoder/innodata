# SpatialGrid

A procedurally generated benchmark that tests whether vision AI models understand **space**: where things are, how they are turned, what is in front of what, and whether a stack will fall.

Built for the Innodata AI Hackathon 2026, Track 2 (Visual Task Factory).

## Documents

- [Technical report](docs/TECHNICAL_REPORT.md): problem, task design, ground truth, validation, results and limitations
- [Demo script](docs/DEMO_SCRIPT.md): a three-minute walkthrough

## Why this is trustworthy

- **Ground truth comes from the scene, never from a person or a model.** Every object's position and rotation is chosen and recorded by the generator, so each answer is arithmetic on numbers we already hold.
- **Every question is answerable from the image.** After rendering, a visibility check measures, per object, how many pixels are visible compared with the object rendered alone. Objects that are occluded (< 70% visible), cut off by the frame, or too small (< 2,500 px) are rejected, and the task is rebuilt from a new seed.
- **Everything is reproducible.** A task is rebuilt exactly from its seed. `npm run bench:validate` re-derives every answer with independent code and rebuilds tasks from their seeds.
- **The answer is never sent to a model.** The evaluator only sends the image and the question.

## Task types

| Tier | Kind | Question | Ground truth |
|---|---|---|---|
| 1 · Pose | `orientation` | Which way does the open side of this container face? | Container yaw, resolved relative to the camera |
| 2 · Relative | `closer` | Which object is closest to the camera? | Euclidean distance, camera to object centre |
| 2 · Relative | `leftmost` | Which object appears furthest left in the image? | Pinhole projection of each centre |
| 3 · Plausibility | `stability` | Will this stack stay standing? | Centre of mass of everything above each box must lie over that box's top face |

Difficulty varies by object count (2–5), lighting (normal or dim), occlusion, floor material, object material and environment lighting.

## Architecture

```
TypeScript (lib/bench)                      Blender (scripts/blender)
  scene layout + ground truth   ──tasks.json──▶  path-traced render (Cycles)
  seeds, styles                  ◀─visibility──  exact object-mask visibility
        │
        ├─ evaluate: Claude / GPT-4o / Gemini     (scripts/bench/eval.ts)
        ├─ validate: independent re-derivation    (scripts/bench/validate.ts)
        └─ report:   accuracy by tier / kind / lighting
Next.js app (app, components): landing page and /app (play, generate, tasks, validate, results, interactive 3D viewer)
```

## Quick start

```bash
npm install
cp .env.example .env.local        # add your keys
npm run dev                        # http://localhost:3000 and /app
```

### Generate the dataset

Photoreal rendering needs [Blender](https://www.blender.org/download/) (4.5 LTS tested) and free CC0 assets from Poly Haven:

```bash
node scripts/blender/fetch-assets.mjs                  # HDRI lighting + floor materials into assets/ (git-ignored)
# set BLENDER_PATH in .env.local to your blender executable
npm run bench:generate -- --count 60 --seed 1          # path-traced (about 1 minute per image on CPU)
npm run bench:generate -- --count 60 --renderer svg    # fast preview renderer, no Blender needed
```

### Validate, evaluate, report

```bash
npm run bench:validate                                 # proves the ground truth
npm run bench:eval -- --model gemini                   # or anthropic | openai
npm run bench:report                                   # writes public/bench/summary.json, shown in /app → Results
```

## Testing

```bash
npm test          # vitest: unit, property and dataset tests (CI runs this on every push)
```

What the suite proves:

- **Ground-truth rules**: closest, left-most, container orientation and stack stability are checked against hand-computed cases, including perspective and order-independence.
- **Independence**: the generator's stability rule and the separate re-derivation agree on 500 random stacks, and both outcomes occur.
- **Visibility check**: accepts clear objects and rejects occluded, off-frame and tiny ones.
- **Determinism**: the same seed rebuilds identical scenes, answers and styles, for every task kind.
- **Prompt safety**: the prompt sent to a model never contains the answer or explanation, and the reply parser rejects ambiguous or out-of-range answers instead of guessing.
- **Shipped dataset**: every stored answer is re-derived exactly, every task passed the visibility check, answer positions are balanced, and a sample rebuilds identically.
- **Mutation tests**: deliberately corrupted answers and altered scenes are detected by the validators.

## Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude evaluation |
| `OPENAI_API_KEY` | GPT-4o evaluation |
| `GEMINI_API_KEY` | Gemini evaluation |
| `BLENDER_PATH` | Path to the Blender executable for photoreal rendering |

Keys are read on the server only and never returned to the browser.

## The app

- **Play**: answer the same questions the models are asked.
- **Generate**: build a fresh scene on the server and ask a configured model about it.
- **Tasks**: browse the dataset, each with a rendered image and an **interactive 3D view** with ground-truth overlays (distances, facing direction, centre of mass).
- **Validate**: re-derive every answer in the browser.
- **Results**: model accuracy by tier, kind and lighting.

## Repository layout

```
lib/bench/        scene generation, ground truth, visibility, models, independent truth (truth.ts)
scripts/bench/    CLI: generate, eval, validate, report
scripts/blender/  render.py (Cycles renderer + exact visibility), fetch-assets.mjs
app/, components/ landing page, /app, API routes
public/bench/     generated tasks, images, results
```

## Credits and licences

- HDRI lighting and floor materials: [Poly Haven](https://polyhaven.com), CC0.
- Renderer: [Blender](https://www.blender.org) (GPL); the rendering script only drives it.

## Limitations

- Scenes are synthetic. They are controlled by design, but they are not photographs of real warehouses.
- Stability uses a centre-of-mass rule for equal-size, equal-density boxes, not a full physics simulation.
- Results depend on prompt wording; the prompt is in `lib/bench/models.ts`.
