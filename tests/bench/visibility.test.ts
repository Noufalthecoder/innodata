import { describe, expect, it } from "vitest";
import { checkVisibility } from "../../lib/bench/visibility";
import { box, CAM, sphere } from "./helpers";

const W = 960, H = 720;
const check = (objects: Parameters<typeof checkVisibility>[0], ids: number[]) => checkVisibility(objects, ids, CAM, W, H);

describe("visibility check", () => {
  it("accepts a clearly visible object", async () => {
    const [v] = await check([sphere(0, [0, 0.45, 0])], [0]);
    expect(v.ok).toBe(true);
    expect(v.visiblePct).toBe(100);
    expect(v.inFrame).toBe(true);
  });

  it("rejects an object hidden behind a larger one", async () => {
    const hidden = sphere(0, [0, 0.45, -2], 0.4);
    const wall = box(1, [0, 1.5, 1.5], [4, 3, 0.5]);
    const [v] = await check([hidden, wall], [0]);
    expect(v.visiblePct).toBeLessThan(70);
    expect(v.ok).toBe(false);
  });

  it("rejects an object cut off by the edge of the frame", async () => {
    const [v] = await check([sphere(0, [5.5, 0.45, 0])], [0]);
    expect(v.inFrame).toBe(false);
    expect(v.ok).toBe(false);
  });

  it("rejects an object too small to make out", async () => {
    const [v] = await check([sphere(0, [0, 0.05, -40], 0.05)], [0]);
    expect(v.pixels).toBeLessThan(2500);
    expect(v.ok).toBe(false);
  });

  it("reports partial occlusion as a percentage", async () => {
    const back = box(0, [0, 0.5, -1], [1.4, 1, 1.4]);
    const front = box(1, [0.5, 0.5, 1], [1, 1, 1]);
    const [v] = await check([back, front], [0]);
    expect(v.visiblePct).toBeGreaterThan(40);
    expect(v.visiblePct).toBeLessThan(100);
  });
});
