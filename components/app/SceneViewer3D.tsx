"use client";

import type { Task } from "@/lib/bench/types";
import SpatialSceneViewer from "@/components/bench/SpatialSceneViewer";

export default function SceneViewer3D({
  task,
  allowTruth = true,
  autoRotate = false,
}: {
  task: Task;
  allowTruth?: boolean;
  autoRotate?: boolean;
}) {
  return <SpatialSceneViewer task={task} allowTruth={allowTruth} autoRotate={autoRotate} />;
}
