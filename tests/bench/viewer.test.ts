import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Task } from "../../lib/bench/types";
import { makeProjector } from "../../lib/bench/geometry";

const FILE = "public/bench/tasks.json";
const tasks: Task[] = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];

describe.skipIf(tasks.length === 0)("Interactive 3D Ground Truth Explorer — Contract & Math Verification", () => {
  it("all 60 tasks have valid 3D camera and object configurations", () => {
    expect(tasks).toHaveLength(60);
    for (const t of tasks) {
      expect(t.camera.pos).toHaveLength(3);
      expect(t.camera.look).toHaveLength(3);
      expect(t.camera.fov).toBeGreaterThan(0);
      expect(t.objects.length).toBeGreaterThan(0);

      for (const o of t.objects) {
        expect(["box", "cylinder", "sphere", "cone"]).toContain(o.shape);
        expect(o.center).toHaveLength(3);
        expect(o.size).toHaveLength(3);
        expect(Number.isFinite(o.rotY)).toBe(true);
        expect(o.size.every((s) => s > 0)).toBe(true);
      }
    }
  });

  it("Depth (closer) tasks: camera distances match ground truth answer across all closer tasks", () => {
    const closerTasks = tasks.filter((t) => t.kind === "closer");
    expect(closerTasks).toHaveLength(20);

    for (const t of closerTasks) {
      const distances = t.objects.map((o) =>
        Math.hypot(o.center[0] - t.camera.pos[0], o.center[1] - t.camera.pos[1], o.center[2] - t.camera.pos[2])
      );
      const minD = Math.min(...distances);
      const nearestIdx = distances.indexOf(minD);
      expect(nearestIdx).toBe(t.answer);
    }
  });

  it("Position (leftmost) tasks: projected screen X matches ground truth answer across all leftmost tasks", () => {
    const leftmostTasks = tasks.filter((t) => t.kind === "leftmost");
    expect(leftmostTasks).toHaveLength(10);

    for (const t of leftmostTasks) {
      const P = makeProjector(t.camera, t.width, t.height);
      const screenXs = t.objects.map((o) => P(o.center)[0]);
      const minX = Math.min(...screenXs);
      const leftmostIdx = screenXs.indexOf(minX);
      expect(leftmostIdx).toBe(t.answer);
    }
  });

  it("Orientation tasks: facing vector quadrant matches ground truth answer across all orientation tasks", () => {
    const orientTasks = tasks.filter((t) => t.kind === "orientation");
    expect(orientTasks).toHaveLength(10);

    for (const t of orientTasks) {
      const r = t.objects[0].rotY;
      const fx = Math.sin(r), fz = Math.cos(r);
      const expected = Math.abs(fz) >= Math.abs(fx) ? (fz > 0 ? 0 : 1) : fx > 0 ? 3 : 2;
      expect(expected).toBe(t.answer);
    }
  });

  it("Stability tasks: center of mass support checks match ground truth across all stability tasks", () => {
    const stabilityTasks = tasks.filter((t) => t.kind === "stability");
    expect(stabilityTasks).toHaveLength(20);

    for (const t of stabilityTasks) {
      const boxes = t.objects.slice().sort((a, b) => a.center[1] - b.center[1]);
      let stable = true;

      for (let i = boxes.length - 1; i >= 1; i--) {
        const above = boxes.slice(i);
        const comX = above.reduce((s, b) => s + b.center[0], 0) / above.length;
        const below = boxes[i - 1];
        const half = below.size[0] / 2;
        const lo = below.center[0] - half;
        const hi = below.center[0] + half;
        if (comX < lo || comX > hi) {
          stable = false;
          break;
        }
      }

      const expectedAnswer = stable ? 0 : 1;
      expect(expectedAnswer).toBe(t.answer);
    }
  });
});
