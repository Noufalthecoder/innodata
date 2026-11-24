export interface FailureDeepDive {
  id: string;
  kind: "stability" | "orientation" | "closer" | "leftmost";
  illusionTitle: string;
  biasCategory: "Stability False Alarm" | "Egocentric Canonical Bias" | "Depth Foreshortening Illusion";
  modelAnswers: { model: string; answer: string; correct: boolean }[];
  groundTruthAnswer: string;
  visualCause: string;
  mathProof: string;
  realWorldImpact: string;
}

export const FAILURE_DEEP_DIVES: Record<string, FailureDeepDive> = {
  s4: {
    id: "s4",
    kind: "stability",
    illusionTitle: "The Offset Overhang Illusion",
    biasCategory: "Stability False Alarm",
    modelAnswers: [
      { model: "Gemini 3.1 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemini 3.5 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemma 4 26B", answer: "It falls", correct: false },
    ],
    groundTruthAnswer: "It stays standing",
    visualCause:
      "The top box is visibly displaced horizontally by 24 cm, forming a distinct visible ledge. 2D vision models mistake visible edge asymmetry for center-of-mass imbalance.",
    mathProof:
      "Base box provides support from x = -0.75 m to +0.75 m (width 1.5 m). The top box center of mass is at x = -0.24 m, leaving a safe 51 cm margin within the support polygon.",
    realWorldImpact:
      "A warehouse inspection camera would falsely flag this pallet as defective, halting automated conveyor lines unnecessarily.",
  },
  s9: {
    id: "s9",
    kind: "orientation",
    illusionTitle: "Egocentric 'Facing-Me' Canonical Bias",
    biasCategory: "Egocentric Canonical Bias",
    modelAnswers: [
      { model: "Gemini 3.1 Flash-Lite", answer: "Toward the camera", correct: false },
      { model: "Gemini 3.5 Flash-Lite", answer: "Toward the camera", correct: false },
      { model: "Gemma 4 26B", answer: "Toward the camera", correct: false },
    ],
    groundTruthAnswer: "To the right in the image",
    visualCause:
      "The container is rotated 78° towards the right. Under perspective projection, the circular rim reveals both front and back interior walls with strong vertical symmetry. Models default to 'toward the camera' due to heavy web image priors of front-facing objects.",
    mathProof:
      "Container orientation yaw θ = 78° (1.36 rad). Normal vector = (sin 78°, 0, cos 78°) = (+0.98, 0, +0.21). Because x-component (+0.98) vastly exceeds z-component, the opening unambiguously points image-right.",
    realWorldImpact:
      "A robotic gripper attempting to enter the container would collide with the closed side-wall, breaking the end-effector or dropping parts.",
  },
  s27: {
    id: "s27",
    kind: "orientation",
    illusionTitle: "Interior Wall Lighting Facade Illusion",
    biasCategory: "Egocentric Canonical Bias",
    modelAnswers: [
      { model: "Gemini 3.1 Flash-Lite", answer: "Toward the camera", correct: false },
      { model: "Gemini 3.5 Flash-Lite", answer: "Toward the camera", correct: false },
      { model: "Gemma 4 26B", answer: "Toward the camera", correct: false },
    ],
    groundTruthAnswer: "To the right in the image",
    visualCause:
      "Container is turned 87° to the right. The studio HDRI lighting brightly illuminates the interior back wall, causing the model to mistake the lit interior surface for an exterior front face.",
    mathProof:
      "Yaw θ = 87° (1.52 rad). Direction vector = (+1.00, 0, +0.05). Points almost purely along the image +x axis.",
    realWorldImpact:
      "Inspection cameras in bin-picking stations fail to detect when containers are loaded sideways on pallets.",
  },
  s28: {
    id: "s28",
    kind: "stability",
    illusionTitle: "Staircase Cantilever Fallacy",
    biasCategory: "Stability False Alarm",
    modelAnswers: [
      { model: "Gemini 3.1 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemini 3.5 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemma 4 26B", answer: "It falls", correct: false },
    ],
    groundTruthAnswer: "It stays standing",
    visualCause:
      "Three boxes form a progressive 'staircase' offset to the right. Vision models assume staggered stacks must topple like falling dominoes without calculating the counterbalancing mass of the middle box.",
    mathProof:
      "Level 2: COM x = +0.25 m vs support [-0.56 m, +0.94 m] (margin 31 cm). Level 1: COM x = +0.22 m vs support [-0.75 m, +0.75 m] (margin 53 cm). Stable at every interface.",
    realWorldImpact:
      "Automated guided vehicles (AGVs) reject safely loaded pallets, degrading throughput in high-velocity sorting hubs.",
  },
  s34: {
    id: "s34",
    kind: "stability",
    illusionTitle: "Tall-Stack Perspective Slant Distortion",
    biasCategory: "Stability False Alarm",
    modelAnswers: [
      { model: "Gemini 3.1 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemini 3.5 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemma 4 26B", answer: "It falls", correct: false },
    ],
    groundTruthAnswer: "It stays standing",
    visualCause:
      "A 4-box stack where each tier shifts slightly back and forth. Perspective foreshortening from an elevated camera angle exaggerates the apparent horizontal displacement of the highest box.",
    mathProof:
      "Level 3: COM x = 0.18 m vs support [-0.76, 0.74] (margin 56 cm). Level 2: COM x = 0.08 m vs support [-0.94, 0.56] (margin 48 cm). Level 1: COM x = -0.01 m vs support [-0.75, 0.75] (margin 74 cm). Extremely stable.",
    realWorldImpact:
      "Demonstrates that vision-language models cannot yet replace classical 3D point-cloud physics validation for warehouse robotics.",
  },
  s52: {
    id: "s52",
    kind: "stability",
    illusionTitle: "Multi-Body Asymmetric Loading Distortion",
    biasCategory: "Stability False Alarm",
    modelAnswers: [
      { model: "Gemini 3.1 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemini 3.5 Flash-Lite", answer: "It falls", correct: false },
      { model: "Gemma 4 26B", answer: "It falls", correct: false },
    ],
    groundTruthAnswer: "It stays standing",
    visualCause:
      "Upper tiers overhang to the right while the lower tiers are positioned centrally. Models evaluate each box pair in isolation instead of calculating the collective mass center of the entire upper body.",
    mathProof:
      "Level 3 COM: 0.16 m vs support [-0.39, 1.11]. Level 2 COM: 0.26 m vs support [-0.63, 0.87]. Level 1 COM: 0.21 m vs support [-0.75, 0.75]. All 3 levels satisfy statics criteria.",
    realWorldImpact:
      "Causes false safety rejections during automated packaging and shrink-wrapping inspections.",
  },
  s57: {
    id: "s57",
    kind: "orientation",
    illusionTitle: "Monocular Depth-Flattening in Dim Light",
    biasCategory: "Egocentric Canonical Bias",
    modelAnswers: [
      { model: "Gemini 3.1 Flash-Lite", answer: "Toward the camera", correct: false },
      { model: "Gemini 3.5 Flash-Lite", answer: "Toward the camera", correct: false },
      { model: "Gemma 4 26B", answer: "Toward the camera", correct: false },
    ],
    groundTruthAnswer: "To the right in the image",
    visualCause:
      "Container turned 76° under workshop lighting. Without stereoscopic binocular disparity, 2D monocular features cannot distinguish which rim contour is nearer to the lens.",
    mathProof:
      "Yaw θ = 76° (1.33 rad). Normal = (+0.97, 0, +0.24). Ground truth points rightward with 97% projection along +x.",
    realWorldImpact:
      "Orientation failures lead directly to failed robotic grasp planning and dropped cargo.",
  },
};
