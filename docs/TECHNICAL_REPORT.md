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

## 4. How reference answers are established

Every answer is arithmetic on numbers the generator chose itself. No person and no model is involved.

| Kind | Rule |
|---|---|
| closest | smallest Euclidean distance from the camera position to the object centre; tasks are kept only if the winner leads by at least 0.8 m |
| left-most | smallest x after pinhole projection through the task camera; kept only if the winner leads by at least 90 px |
| orientation | the open side faces (sin θ, 0, cos θ) for yaw θ; the camera looks along −z, so +z is toward the camera and +x is image-right; yaw is within ±0.3 rad of a cardinal direction |
| stability | for every box, the centre of mass of all boxes above it must lie over that box's top face (equal size and density); kept only if every margin is at least 0.12 m, so no case is borderline |

**Every question is answerable from the image.** After rendering, Blender draws each object in a unique flat colour, then counts its visible pixels in the full scene and when drawn alone. An object must be at least 70% unoccluded, fully inside the frame, and at least 2,500 px. Otherwise the task is discarded and rebuilt.

## 5. Validation evidence (independent of the model)

| Check | Result |
|---|---|
| Answers re-derived by separate code (`lib/bench/truth.ts`, shares no logic with the generator) | 60 / 60 |
| Tasks rebuilt identically from their seeds | 60 / 60 |
| Visibility check passed | 60 / 60 |
| Automated test suite (`npm test`, vitest, run in CI) | 80 / 80 passing |

The test suite also includes:

- **Rule tests:** hand-computed cases for every kind, including perspective effects and object-order independence.
- **Property test:** the generator's stability rule and the independent re-derivation agree on 500 random stacks.
- **Visibility tests:** occluded, off-frame and tiny objects are rejected.
- **Prompt-safety tests:** the prompt never contains the answer or explanation, and the reply parser rejects ambiguous replies instead of guessing.
- **Mutation tests:** deliberately corrupted answers and altered scenes are detected by the validators.

**Bugs the tests found and fixed during development:**

1. The reply parser contained a character-escaping error that silently turned replies like "Answer: D" into "no answer". This would have corrupted every score.
2. A 2-box stack could never be generated as unstable, so the first dataset had 19 of 20 stability tasks answer "stands". A model that always said "stands" would have scored 95% on Tier 3. Outcomes are now set explicitly and balanced, and a dataset test enforces 40–60% balance.

## 6. Evaluation setup

- **Models:** Gemini 3.1 Flash-Lite, Gemini 3.5 Flash-Lite and the open-weights Gemma 4 26B, via the Gemini API. Claude and GPT-4o are fully supported by the code, but were not run because no funded API keys were available to the team. We report only the models we actually ran.
- **Prompt:** the image, the question and lettered options, plus "Reply with only the letter of the correct option". Temperature 0, hidden reasoning disabled where supported.
- **Scoring:** a strict letter parser. Ambiguous or unparseable replies count as wrong, and API errors are reported separately and excluded from accuracy.

## 7. Results

Each model was run on all 60 tasks, image plus question, temperature 0. Only complete runs are reported. Gemini 3.5 Flash and Gemini 3 Flash hit their free daily quota partway through; their partial runs are kept (the evaluator resumes them) but excluded here.

| Model | Overall | Tier 1 · Orientation | Tier 2 · Depth and position | Tier 3 · Stability | Dim light |
|---|---|---|---|---|---|
| Gemini 3.1 Flash-Lite | **81.7%** | 50% | 97% | 75% | 100% |
| Gemma 4 26B (open weights) | **80.0%** | 70% | 100% | 55% | 83% |
| Gemini 3.5 Flash-Lite | **75.0%** | 20% | 90% | 80% | 83% |

Chance level: orientation 25% (four options), stability 50% (two options), depth and position 25–50% (two to five options).

### Findings

1. **Depth ordering and image position are nearly solved.** All three models score 90–100% on "closest to the camera" and "furthest left", even with up to five objects and partial occlusion.
2. **Orientation is the weakest skill.** Average accuracy is 47%. Gemini 3.5 Flash-Lite scores 20%, below random guessing. The models collapse onto one answer. Of the 10 orientation tasks, Gemini 3.5 Flash-Lite answered "toward the camera" 9 times and Gemini 3.1 Flash-Lite 7 times, and neither ever chose "left" or "right", although those are correct for 4 of the 10 tasks. *Impact:* a robot relying on these models would approach containers from the wrong side.
3. **Every model over-predicts collapse.** All three identify all 10 unstable stacks correctly, but they recognise only 1–6 of the 10 stable ones; Gemma 4 recognises only 1 of the 10. The models appear to treat any visible offset as unstable rather than reasoning about the centre of mass. *Impact:* an inspection system would raise frequent false alarms, and the 55–80% accuracy overstates real understanding.
4. **Dim lighting did not hurt.** Accuracy under dim light was equal to or higher than under normal light, so the weaknesses above are about reasoning, not visibility. This is consistent with the visibility check guaranteeing that every object is clearly visible.
5. **Seven scenes defeated every model:** 4 stability tasks (all stable stacks judged as falling) and 3 orientation tasks. They are shown in the failure gallery on the website and in the app.

### Evaluation notes

- Gemma 4 writes its reasoning before the answer ("… The correct option is B"). The reply parser reads the final stated answer; this was added with tests after the first scoring pass gave Gemma 0%. All saved replies were re-scored with `npm run bench:reparse` (no new API calls), and replies cut off by a token limit were asked again with a larger limit. Three Gemma replies still contained no answer and are counted as wrong.
- API errors (rate limits, server overload) are retried and never counted as wrong answers.
- With 10–40 tasks per tier, per-tier numbers are indicative (about ±15 percentage points at 95% confidence for 10 tasks). The generator can produce larger sets; the limit was free API quota.

## 8. Limitations (stated honestly)

- **Synthetic scenes:** controlled by design, but not photographs of real warehouses.
- **Stability rule:** a centre-of-mass rule for equal-size, equal-density boxes, not a full physics simulation.
- **Sample size:** 60 tasks gives wide confidence intervals per tier. The generator can produce any number, so this is limited by rendering time (about 1 minute per image on CPU) and free API quotas, not by design.
- **Model coverage:** only Gemini-family models were evaluated, for cost reasons.
- **Prompt sensitivity:** results depend on prompt wording. The exact prompt is in `lib/bench/models.ts`.
- **No manual fixes:** no generated output was edited by hand.

## 9. Reproducing everything

```bash
npm install
node scripts/blender/fetch-assets.mjs          # CC0 lighting and floors
npm run bench:generate -- --count 60 --seed 1  # needs BLENDER_PATH in .env.local
npm run bench:validate
npm test
npm run bench:eval -- --model gemini --model-id gemini-3.5-flash
npm run bench:report
npm run dev                                    # site at /, app at /app
```
