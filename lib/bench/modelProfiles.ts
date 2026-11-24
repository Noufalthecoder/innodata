export interface ModelProfile {
  id: string;
  name: string;
  architecture: string;
  license: string;
  headline: string;
  keyFindings: string[];
  strengths: string[];
  weaknesses: string[];
}

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    architecture: "Multimodal Transformer (Proprietary)",
    license: "Gemini API",
    headline:
      "Highest overall benchmark accuracy (81.7%) with near-perfect relative depth ordering, but collapses into front-facing bias on 3D orientation.",
    keyFindings: [
      "Depth & Position (97%): Correct on 29 of 30 relative distance and pinhole projection tasks.",
      "Orientation (50%): Answered 'toward the camera' 7 out of 10 times, never selecting 'left' or 'right' even when correct.",
      "Stability (75%): Successfully caught all 10 unstable stacks, but falsely predicted collapse on 5 stable stacks.",
      "Lighting Invariance (100%): Achieved 100% on dim-light tasks, proving failure modes stem from spatial reasoning rather than pixel noise.",
    ],
    strengths: [
      "Euclidean 3D distance ordering under perspective",
      "Pinhole horizontal coordinate comparison",
      "Robustness to low-light illumination shifts",
    ],
    weaknesses: [
      "Egocentric canonical bias on 3D object rotation",
      "Overhang heuristic bias on multi-tier box stacks",
    ],
  },
  "gemma-4-26b-a4b-it": {
    id: "gemma-4-26b-a4b-it",
    name: "Gemma 4 26B (open weights)",
    architecture: "Dense Open-Weights Multimodal LLM",
    license: "Open Weights (Apache 2.0 / Gemma Terms)",
    headline:
      "Superior 3D pose extraction (70%) and flawless depth ordering (100%), but crippled by extreme false-alarm collapse bias on physical stability (55%).",
    keyFindings: [
      "Depth & Position (100%): Flawless 30/30 score on closest-object and leftmost-object spatial tests.",
      "Orientation (70%): Highest orientation score among all tested models; successfully parsed container opening angles.",
      "Stability (55%): Severe false alarm bias. Accurately detected all 10 unstable stacks, but falsely classified 9 out of 10 stable stacks as falling.",
      "Reasoning Chain: Formulates visual chain-of-thought tokens prior to outputting the final choice.",
    ],
    strengths: [
      "3D rotational symmetry discrimination",
      "Perfect relative distance sorting with occlusion",
      "Chain-of-thought visual explanation extraction",
    ],
    weaknesses: [
      "Extreme collapse over-prediction on stable physical structures",
      "Prone to truncation without sufficient token allocation",
    ],
  },
  "gemini-3.5-flash-lite": {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    architecture: "Lightweight Multimodal Reasoning Model",
    license: "Gemini API",
    headline:
      "Top-performing stability & statics reasoning (80%), but suffers total mode collapse on 3D container orientation (20%, below random chance).",
    keyFindings: [
      "Stability (80%): Best physics balance discernment across all models, correctly validating 6 of 10 stable box stacks.",
      "Orientation (20%): Fell below the 25% random guessing floor. Answered 'toward the camera' in 9 out of 10 orientation trials.",
      "Relative Depth (90%): High overall accuracy with occasional sensitivity to partial occlusion.",
      "Dim Light (83%): Minimal degradation under low ambient photon counts.",
    ],
    strengths: [
      "Statics & center-of-mass balance calculation",
      "Multi-box vertical support reasoning",
      "Fast response latency (< 1.2s)",
    ],
    weaknesses: [
      "Severe mode collapse on monocular cavity orientation",
      "Vulnerable to interior shadow visual illusions",
    ],
  },
};
