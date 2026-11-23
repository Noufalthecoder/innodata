# Demo video script (about 3 minutes)

Record the screen at 1080p with `npm run dev` running. Speak slowly; each block is about 20–30 seconds.

## 1. The problem (0:00–0:25), landing page hero

> "Robots and inspection cameras need to know which object is closer, how it is turned, and whether a stack will fall. A wrong answer means a collision or a toppled pallet. SpatialGrid tests whether today's vision models really have these skills."

Scroll slowly through *Why it matters*.

## 2. How the tasks are made (0:25–0:55), app → Tasks

Open a task card, show the rendered image, then switch to **Interactive 3D** and rotate it.

> "Every scene is generated from numbers we choose: object positions, rotations, camera. It is rendered photorealistically in Blender, with real studio and workshop lighting. Because we placed everything, we already know the answer. No person and no AI decides what is correct."

Turn on **Show ground truth**: the distance lines, the open-side arrow, the centre-of-mass markers.

## 3. Every question is answerable (0:55–1:15), same task

Point at the *Visibility check* lines.

> "After rendering, we count each object's visible pixels in the scene and on its own. If an object is hidden, cut off or too small, the task is thrown away and rebuilt. So every question can be answered from the image alone."

## 4. Variation (1:15–1:35), Tasks filters

Click through *closer*, *leftmost*, *orientation*, *stability*.

> "Four kinds of reasoning across three tiers: depth, image position, 3D orientation and physical stability. Object count, occlusion, lighting, materials and environment all vary."

## 5. Scoring separates right from wrong (1:35–2:10), app → Generate

Generate a new scene, answer it yourself, then click **Ask Gemini …** on two models.

> "The model only gets the image and the question. Its letter is parsed strictly and scored automatically: green when right, red when wrong."

## 6. Validation (2:10–2:30), app → Validate

Click **Run validation**.

> "Independent code re-derives all 60 answers from raw scene numbers, every task rebuilds identically from its seed, and every task passed the visibility check. Seventy-seven automated tests run on every push."

## 7. Findings (2:30–2:55), landing page → Results, or app → Results

Read out the overall accuracy per model and the weakest tier, then show the failure gallery.

> "Here is where today's models break: [weakest tier and one concrete failure]. These are exactly the errors that matter for robots."

## 8. Close (2:55–3:05)

> "SpatialGrid: a reusable generator, verified answers and honest results. The code is on GitHub."
