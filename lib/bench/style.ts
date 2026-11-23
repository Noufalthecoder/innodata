import { makeRng } from "./rng";
import type { RenderStyle } from "./types";

export const HDRIS = ["brown_photostudio_02", "blue_photo_studio", "blocky_photo_studio", "aircraft_workshop_01", "autoshop_01", "carpentry_shop_02"];
export const FLOORS = ["concrete_floor_02", "brushed_concrete", "brown_floor_tiles", "anti_slip_concrete", "plain"];
export const MATERIALS = ["matte", "plastic", "metal"] as const;

/** Deterministic visual style for a task, derived from its seed only (never from the answer). */
export function styleFor(seed: number): RenderStyle {
  const rng = makeRng(seed * 7919 + 13);
  return {
    hdri: rng.pick(HDRIS),
    floor: rng.pick(FLOORS),
    material: rng.pick(MATERIALS),
    hdriRotation: Math.round(rng.between(0, 360)),
    exposure: Math.round(rng.between(0.8, 1.3) * 100) / 100,
  };
}
