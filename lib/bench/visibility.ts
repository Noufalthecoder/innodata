import sharp from "sharp";
import { facesOf, makeProjector, MASK_RGB, objectName } from "./geometry";
import { renderSvg } from "./render";
import type { Camera, SceneObject, Visibility } from "./types";

export const MIN_VISIBLE = 0.7; // an object must be at least 70% unoccluded
export const MIN_PIXELS = 2500; // and big enough to make out

/** Counts mask pixels per object id by rendering flat-colour object masks. */
async function maskCounts(objects: SceneObject[], cam: Camera, w: number, h: number): Promise<Map<number, number>> {
  const svg = renderSvg(objects, cam, w, h, "mask");
  const { data, info } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const ids = Array.from(new Set(objects.map((o) => o.id)));
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += info.channels) {
    for (const id of ids) {
      const m = MASK_RGB[id % MASK_RGB.length];
      if (Math.abs(data[i] - m[0]) + Math.abs(data[i + 1] - m[1]) + Math.abs(data[i + 2] - m[2]) < 24) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
        break;
      }
    }
  }
  return counts;
}

/**
 * Visibility check: for each question-relevant object, compare its visible pixels in the full scene with its
 * pixels when rendered alone. Rejects objects that are occluded, cut off by the frame, or too small.
 */
export async function checkVisibility(all: SceneObject[], subjectIds: number[], cam: Camera, w: number, h: number): Promise<Visibility[]> {
  const full = await maskCounts(all, cam, w, h);
  const P = makeProjector(cam, w, h);
  const report: Visibility[] = [];
  for (const id of subjectIds) {
    const parts = all.filter((o) => o.id === id);
    const alone = (await maskCounts(parts, cam, w, h)).get(id) ?? 0;
    const seen = full.get(id) ?? 0;
    const pts = facesOf(parts).flatMap((f) => f.verts.map(P));
    const inFrame = pts.every((p) => p[2] > 0.3 && p[0] >= 8 && p[0] <= w - 8 && p[1] >= 8 && p[1] <= h - 8);
    const ratio = alone ? seen / alone : 0;
    report.push({
      object: objectName(parts[0]),
      visiblePct: Math.round(ratio * 100),
      inFrame,
      pixels: alone,
      ok: inFrame && alone >= MIN_PIXELS && ratio >= MIN_VISIBLE,
    });
  }
  return report;
}
