# SpatialGrid: Technical Report

Innodata AI Hackathon 2026, Track 2: Visual Task Factory

## 1. The problem and why errors matter

**Visual capability tested:** spatial and pose reasoning. That means judging depth order, horizontal position, object orientation, and physical stability from a single image.

**Application:** robotic manipulation and automated inspection in warehouses and factories. Before a robot can pick an item, it must know which item is nearest, how the item is turned, and whether a stack it is about to touch is stable. Inspection cameras need the same skills to flag misaligned parts or unsafe pallets.

**Why errors are costly:**

| Model error | Real-world consequence |
|---|---|
| Wrong depth order | A robot arm reaches for the wrong item or collides with one it did not see |
| Wrong orientation | The gripper approaches from the wrong side and fails to grasp |
| Wrong stability judgement | An unsafe stack is reported as safe and topples |

These are not quiz mistakes. They are the failure modes that stop vision-language models from being trusted as the perception layer of a physical system.

## 2. Image family and task design

Synthetic 3D scenes of primitive objects (boxes, cylinders, spheres, cones, open containers and box stacks) on realistic floors under real-world lighting, rendered with a path tracer.

| Tier | Kind | Question | Options |
|---|---|---|---|
| 1 · Pose | `orientation` | Which way does the open side of the container face? | toward / away / left / right |
| 2 · Relative | `closer` | Which object is closest to the camera? | one per object (2–5) |
| 2 · Relative | `leftmost` | Which object appears furthest left in the image? | one per object (2–5) |
| 3 · Plausibility | `stability` | Will this stack of boxes stay standing, or fall? | stands / falls |

**How the tasks vary in reasoning, not just wording:** the four kinds need different reasoning. Depth ordering needs 3D distance, left-most needs image-plane projection under perspective, orientation needs reading a 3D rotation, and stability needs a physical centre-of-mass judgement. Within each kind, difficulty varies independently:

- object count (1–5), with partial occlusion (46 of 167 asked-about objects are partly hidden, the minimum is 75% visible)
- lighting (48 normal, 12 dim)
- 6 real-world HDRI environments (photo studios, workshops, garage), 5 floor materials and 3 object materials (matte, plastic, metal)
- stack height (2–4 boxes), with outcomes balanced 10 stands / 10 falls

**Shipped dataset:** 60 tasks: 20 closest, 10 left-most, 10 orientation, 20 stability.

## 3. Pipeline

```
seed ─▶ layout (TypeScript)        objects, camera, render style; deterministic from the seed
     ─▶ ground truth (TypeScript)  computed from the layout numbers only
     ─▶ render (Blender Cycles)    path-traced image with CC0 HDRI lighting and PBR floors
     ─▶ visibility (Blender)       exact per-object pixel counts from flat-colour mask renders
     ─▶ task JSON + image          rejected and rebuilt from a new seed if any visibility check fails
     ─▶ evaluate                   image + question sent to the model; letter parsed and scored
     ─▶ report                     accuracy by model, tier, kind, object count and lighting
```

A fast SVG renderer is kept for previews and for the live "Generate" tab of the app.

### Reused components

What we wrote ourselves: the scene generator, the ground-truth rules, the independent re-derivation, the visibility gate, the reply parser, the statistics, the evaluator and the whole app. Everything below is an existing tool or asset that we use as-is.

| Component | Used for | Licence |
|---|---|---|
| Blender (Cycles path tracer) | Photoreal rendering and the flat-colour visibility masks; driven by our Python script, run as an external program | GPL (tool only, not linked into our code) |
| Poly Haven HDRIs and floor textures | Real-world lighting and floor materials, downloaded by `scripts/blender/fetch-assets.mjs` | CC0 |
| Next.js 15, React 19, Tailwind CSS, Framer Motion | Website and app | MIT |
| React Flow (`@xyflow/react`) | The node-based pipeline view | MIT |
| three.js, React Three Fiber, drei | 3D reconstruction of each task from its scene numbers | MIT |
| sharp | Rasterising SVG masks for the fast visibility check | Apache 2.0 |
| vitest, tsx | Test suite and TypeScript scripts | MIT |
| Gemini API; Cloudflare Workers AI | The six evaluated models (see §6) | Provider terms |
| Anthropic, OpenAI, OpenRouter APIs | Optional "Bring Your Own Key" models in the app | Provider terms |
| Vercel | Hosting the live prototype | Free tier |

AI coding assistants were used while writing the code. Every number in this report comes from the stored result files, and the tests check that.

## 4. How reference answers are established

Every answer is arithmetic on numbers the generator chose itself. No person and no model is involved.

| Kind | Rule |
|---|---|
| closest | smallest Euclidean distance from the camera position to the object centre; tasks are kept only if the winner leads by at least 0.8 m |
| left-most | smallest x after pinhole projection through the task camera; kept only if the winner leads by at least 90 px |
| orientation | the open side faces (sin θ, 0, cos θ) for yaw θ; the camera looks along −z, so +z is toward the camera and +x is image-right; yaw is within ±0.3 rad of a cardinal direction |
| stability | for every box, the centre of mass of all boxes above it must lie over that box's top face (equal size and density); kept only if every margin is at least 0.12 m, so no case is borderline |

### Core assumptions

1. **The image shows the scene the answer was computed from.** Blender receives the exact object positions, sizes, rotations and camera that the answer was computed from; nothing in the layout is random at render time. The 3D view in the app rebuilds each task from the same numbers, so this can be checked by eye.
2. **"Closest" means distance from the camera to the object's centre.** A task is kept only if the winner leads by at least 0.8 m, so small differences in definition (for example nearest surface instead of centre) are unlikely to change the answer.
3. **Stability is judged statically.** Rigid boxes of equal size and density, no friction or dynamics. A centre-of-mass rule decides, and a 12 cm minimum margin keeps every case far from the tipping point.
4. **Orientation labels are unambiguous.** The yaw is always within ±0.3 rad (about 17°) of one of four directions, so there is one clearly correct option.
5. **A question is answerable if every object it mentions is at least 70% visible, fully inside the frame and at least 2,500 pixels.** Below this the task is rejected.
6. **Models see only the image, the question and the options.** One answer per task at temperature 0; the answer and the explanation are never sent (a test enforces this).

**Every question is answerable from the image.** After rendering, Blender draws each object in a unique flat colour, then counts its visible pixels in the full scene and when drawn alone. An object must be at least 70% unoccluded, fully inside the frame, and at least 2,500 px. Otherwise the task is discarded and rebuilt.

## 5. Validation evidence (independent of the model)

| Check | Result |
|---|---|
| Answers re-derived by separate code (`lib/bench/truth.ts`, shares no logic with the generator) | 60 / 60 |
| Tasks rebuilt identically from their seeds | 60 / 60 |
| Visibility check passed | 60 / 60 |
| Automated test suite (`npm test`, vitest, run in CI) | 117 / 117 passing |
| Code mutation testing (`npm run bench:mutation`) | 17 / 17 defects caught |

The test suite also includes:

- **Rule tests:** hand-computed cases for every kind, including perspective effects and object-order independence.
- **Property test:** the generator's stability rule and the independent re-derivation agree on 500 random stacks.
- **Visibility tests:** occluded, off-frame and tiny objects are rejected.
- **Prompt-safety tests:** the prompt never contains the answer or explanation, and the reply parser rejects ambiguous replies instead of guessing.
- **Data mutation tests:** deliberately corrupted answers and altered scenes are detected by the validators.
- **Code mutation testing:** see below.

### Code mutation testing

`npm run bench:mutation` breaks the implementation in 17 deliberate ways, one at a time, runs the full test suite against each broken version, and restores the code. A defect the tests catch is *killed*. Results are saved to [`public/bench/mutation-report.json`](../public/bench/mutation-report.json).

**Result: 17 of 17 defects caught.** The first run caught 16. The survivor (M13: the reply parser taking a model's *first* stated answer instead of its final one) would have mis-scored models that reason out loud and change their mind, such as Gemma 4. We added a test for it, and the re-run caught all 17.

| # | Deliberate defect | First test that caught it |
|---|---|---|
| M1 | Depth: re-derivation picks the farthest object instead of the nearest | `dataset.test.ts: every stored answer is re-derived exactly by independent code` |
| M2 | Position: re-derivation picks the right-most object | `dataset.test.ts: every stored answer is re-derived exactly by independent code` |
| M3 | Orientation: towards / away from the camera swapped | `dataset.test.ts: every stored answer is re-derived exactly by independent code` |
| M4 | Orientation: left / right swapped | `dataset.test.ts: every stored answer is re-derived exactly by independent code` |
| M5 | Stability: support region twice as wide (too lenient) | `stability.test.ts: the generator's rule and the independent re-derivation agree on 500 random stacks` |
| M6 | Stability: only the top box is checked | `stability.test.ts: the generator's rule and the independent re-derivation agree on 500 random stacks` |
| M7 | Generator: depth answer set to the farthest object | `dataset.test.ts: rebuilds a sample of tasks identically from their seeds` |
| M8 | Generator: orientation answer towards / away swapped | `dataset.test.ts: rebuilds a sample of tasks identically from their seeds` |
| M9 | Generator: stable and unstable labels swapped | `generation.test.ts: ground truth matches the independent re-derivation across seeds` |
| M10 | Visibility: occlusion threshold disabled (0% visible passes) | `visibility.test.ts: rejects an object hidden behind a larger one` |
| M11 | Visibility: objects cut off by the frame still pass | `dataset.test.ts: rebuilds a sample of tasks identically from their seeds` |
| M12 | Visibility: minimum object size disabled | `visibility.test.ts: rejects an object too small to make out` |
| M13 | Scoring: first stated answer wins instead of the final one | `models.test.ts: takes the final stated answer when a model changes its mind` |
| M14 | Scoring: letters beyond the offered options accepted | `models.test.ts: rejects "C" instead of guessing` |
| M15 | Statistics: 90% instead of 95% confidence interval | `metrics.test.ts: wilson interval brackets the estimate and is wide for small n` |
| M16 | Statistics: chance adjustment not rescaled | `metrics.test.ts: chance-adjusted maps guessing to 0 and perfect to 1` |
| M17 | Statistics: McNemar test one-sided instead of two-sided | `metrics.test.ts: mcnemar exact matches known values` |

**Bugs the tests found and fixed during development:**

1. The reply parser contained a character-escaping error that silently turned replies like "Answer: D" into "no answer". This would have corrupted every score.
2. A 2-box stack could never be generated as unstable, so the first dataset had 19 of 20 stability tasks answer "stands". A model that always said "stands" would have scored 95% on Tier 3. Outcomes are now set explicitly and balanced, and a dataset test enforces 40–60% balance.

## 6. Evaluation setup

- **Models:** six models from four companies. From Google: Gemini 3.1 Flash-Lite, Gemini 3.5 Flash-Lite and the open-weights Gemma 4 26B, via the Gemini API. Open-weights Qwen3.8 27B (Alibaba), Mistral Small 3.1 24B (Mistral AI) and Llama 4 Scout 17B (Meta), via Cloudflare Workers AI. Claude and GPT-4o are fully supported by the code, but were not run because no funded API keys were available to the team. We report only the models we actually ran.
- **Prompt:** the image, the question and lettered options, plus "Reply with only the letter of the correct option". The same prompt goes to every model. Temperature 0, hidden reasoning disabled where supported.
- **Scoring:** a strict letter parser. Ambiguous or unparseable replies count as wrong, and API errors are reported separately and excluded from accuracy.

## 7. Results

Each model was run on all 60 tasks, image plus question, temperature 0, hidden reasoning disabled. Only complete runs are reported. Gemini 3.5 Flash and Gemini 3 Flash hit their free daily quota partway through; their partial runs are kept (the evaluator resumes them) but excluded here.

| Model | Company | Overall | Tier 1 · Orientation | Tier 2 · Depth & position | Tier 3 · Stability | Dim light |
|---|---|:-:|:-:|:-:|:-:|:-:|
| Qwen3.8 27B | Alibaba (open weights) | **88.3%** | 50% | 97% | 95% | 92% |
| Gemini 3.1 Flash-Lite | Google | **81.7%** | 50% | 97% | 75% | 100% |
| Mistral Small 3.1 24B | Mistral AI (open weights) | **81.7%** | 30% | 90% | 95% | 75% |
| Gemma 4 26B | Google (open weights) | **80.0%** | 70% | 100% | 55% | 83% |
| Gemini 3.5 Flash-Lite | Google | **75.0%** | 20% | 90% | 80% | 83% |
| Llama 4 Scout 17B | Meta (open weights) | **70.0%** | 40% | 67% | 90% | 75% |

Chance level: orientation 25% (four options), stability 50% (two options), depth and position 25–50% (two to five options).

### Findings

1. **Depth ordering and image position are nearly solved.** Five of the six models score 90–100% on "closest to the camera" and "furthest left", even with up to five objects and partial occlusion (average 90%). Llama 4 Scout is the exception at 67%, mostly on depth (60% on "closest").
2. **Orientation is weak for every company's model.** Average accuracy is 43%, against 25% for guessing. Gemini 3.5 Flash-Lite scores 20%, below random guessing. The models collapse onto "toward" or "away from" the camera: across all 60 orientation answers (6 models × 10 tasks), only one was "left" or "right", although those are correct for 4 of the 10 tasks. Llama 4 answered "away from the camera" for all 10. *Impact:* a robot relying on any of these models would approach containers from the wrong side.
3. **Over-predicting collapse is a model-family habit, not a universal one.** The three Google models identify all 10 unstable stacks but recognise only 1–6 of the 10 stable ones (Gemma 4: 1 of 10). They appear to treat any visible offset as unstable. Qwen, Mistral and Llama recognise all 10 stable stacks and still catch 8–9 of the 10 unstable ones, scoring 90–95% on Tier 3. *Impact:* the choice of model decides whether an inspection system raises constant false alarms. The benchmark exposes the difference, and a single-vendor evaluation would have hidden it.
4. **An open-weights model leads overall.** Alibaba's Qwen3.8 27B scored 88.3% (95% Wilson interval 78–94%), with 95% on stability and 97% on depth and position. On paired answers (exact McNemar test) the lead is significant over Llama 4 Scout (p = 0.007) and Gemini 3.5 Flash-Lite (p = 0.02), but not over Mistral Small 3.1, Gemini 3.1 Flash-Lite or Gemma 4 (p ≈ 0.27–0.29); a larger dataset would be needed to separate them.
5. **Lighting made no consistent difference.** Some models scored higher in dim light and some lower. This is consistent with the visibility check guaranteeing that every object is clearly visible, so the weaknesses above are about reasoning, not perception.
6. **Three scenes defeated all six models:** s9, s27 and s57. All three are orientation tasks whose answer is "to the right in the image". With three Google models alone, seven scenes defeated every model; four of those (stable stacks) were solved by the non-Google models. All are shown in the failure gallery on the website and in the app.

### Evaluation notes

- **Providers.** Gemini and Gemma were called through the Gemini API; Llama 4 Scout, Mistral Small 3.1 and Qwen3.8 through Cloudflare Workers AI (free tier). Every answer is stored with the exact model that produced it in `public/bench/results/`.
- **Hidden reasoning off for every model that has it.** For Gemini this is `thinkingBudget: 0`. For Qwen it is `enable_thinking: false`; with thinking on, Qwen spent its whole token budget reasoning and returned no answer.
- Gemma 4 writes its reasoning before the answer ("… The correct option is B"). The reply parser reads the final stated answer; this was added with tests after the first scoring pass gave Gemma 0%. All saved replies were re-scored with `npm run bench:reparse` (no new API calls), and replies cut off by a token limit were asked again with a larger limit. Three Gemma replies still contained no answer and are counted as wrong.
- API errors (rate limits, server overload) are retried and never counted as wrong answers.
- With 10–40 tasks per tier, per-tier numbers are indicative (about ±15 percentage points at 95% confidence for 10 tasks). The generator can produce larger sets; the limit was free API quota.

## 8. Limitations (stated honestly)

- **Synthetic scenes:** controlled by design, but not photographs of real warehouses.
- **Stability rule:** a centre-of-mass rule for equal-size, equal-density boxes, not a full physics simulation.
- **Sample size:** 60 tasks gives wide confidence intervals per tier. The generator can produce any number, so this is limited by rendering time (about 1 minute per image on CPU) and free API quotas, not by design.
- **Model coverage:** six models from four companies (Google, Alibaba, Mistral AI, Meta). Claude and GPT-4o are supported by the code but were not run, for cost reasons.
- **Prompt sensitivity:** results depend on prompt wording. The exact prompt is in `lib/bench/models.ts`.
- **No manual fixes to outputs:** no generated task, image or answer was edited by hand. The only corrections were to code (the two bugs in §5 and the reply parser in §7), each followed by regenerating or re-scoring from the stored replies.

## 9. Reproducing everything

```bash
npm install
node scripts/blender/fetch-assets.mjs          # CC0 lighting and floors
npm run bench:generate -- --count 60 --seed 1  # needs BLENDER_PATH in .env.local
npm run bench:validate
npm test
npm run bench:eval -- --model gemini --model-id gemini-3.5-flash
npm run bench:report
npm run bench:mutation                         # break the code 17 ways; the tests must catch each one
npm run dev                                    # site at /, app at /app
```

**With Docker** (no Node.js or Blender needed; the rendered dataset ships in the image):

```bash
docker compose up --build                          # app at http://localhost:3000/app (model keys optional, in .env)
docker compose run --rm tools                      # all automated tests
docker compose run --rm tools run bench:validate   # re-derive every answer, rebuild every task
docker compose run --rm tools run bench:mutation   # mutation testing
```

CI builds this image on every push and checks that the container serves the app and passes validation.
