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
  "@cf/qwen/qwen3.8-27b": {
    id: "@cf/qwen/qwen3.8-27b",
    name: "Qwen3.8 27B (Alibaba)",
    architecture: "Dense Open-Weights Vision-Language Model",
    license: "Qwen Research License",
    headline:
      "Top-ranked model on SpatialGrid (88.3%). Dominates physical stability (95%) and relative depth, but shares the universal web-prior bias on container orientation.",
    keyFindings: [
      "Stability (95%): Outstanding physical balance reasoning, accurately discerning 9 of 10 stable configurations without false-alarm collapse bias.",
      "Depth & Position (100%): Flawless 30/30 score on relative distance sorting and leftmost pinhole projection.",
      "Orientation (50%): Modest performance on 3D rotation, struggling with monocular rim symmetry.",
      "Dim Light (100%): Zero degradation under low ambient lighting conditions.",
    ],
    strengths: [
      "Exceptional statics & center-of-mass balance calculation",
      "Perceptual depth ordering under perspective",
      "Low false-alarm rate on complex box stacks",
    ],
    weaknesses: [
      "3D rotational yaw estimation from single-view silhouettes",
      "Container interior cavity depth disambiguation",
    ],
  },
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    architecture: "Multimodal Transformer (Proprietary)",
    license: "Gemini API",
    headline:
      "High spatial precision (81.7%) with near-perfect relative depth ordering, but collapses into front-facing bias on 3D orientation.",
    keyFindings: [
      "Depth & Position (97%): Correct on 29 of 30 relative distance and pinhole projection tasks.",
      "Orientation (50%): Answered 'toward the camera' 7 out of 10 times, never selecting 'left' or 'right' even when correct.",
      "Stability (75%): Caught all 10 unstable stacks, but falsely predicted collapse on 5 stable stacks.",
      "Dim Light (100%): Proves failure modes stem from spatial reasoning rather than pixel noise.",
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
  "@cf/mistralai/mistral-small-3.1-24b-instruct": {
    id: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1 24B",
    architecture: "Open-Weights Dense Vision-Language Model",
    license: "Apache 2.0",
    headline:
      "Tied for 2nd place (81.7%). Shows balanced geometric reasoning across tiers with minimal mode collapse.",
    keyFindings: [
      "Stability (85%): Strong mechanical balance intuition, correctly classifying both stable and unstable stacks.",
      "Depth (93%): Reliable object distance discrimination across multi-object scenes.",
      "Orientation (50%): Struggles with container facing angles, though less prone to pure 'toward camera' collapse.",
      "Dim Light (83%): Solid performance in shadowed environments.",
    ],
    strengths: [
      "Multi-box vertical support statics",
      "Relative horizontal positioning",
      "Resilience against extreme camera elevation angles",
    ],
    weaknesses: [
      "Single-view monocular rotation parsing",
      "Fine depth resolution between closely spaced objects",
    ],
  },
  "gemma-4-26b-a4b-it": {
    id: "gemma-4-26b-a4b-it",
    name: "Gemma 4 26B (open weights)",
    architecture: "Dense Open-Weights Multimodal LLM",
    license: "Open Weights (Gemma Terms)",
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
      "Solid stability reasoning (80%), but suffers total mode collapse on 3D container orientation (20%, below random chance).",
    keyFindings: [
      "Stability (80%): Best physics balance discernment across Gemini family, correctly validating 6 of 10 stable box stacks.",
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
  "@cf/meta/llama-4-scout-17b-16e-instruct": {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B",
    architecture: "Open-Weights Multimodal Mixture-of-Experts",
    license: "Llama 4 Community License",
    headline:
      "Balanced spatial perception (70.0%) across all three tiers, with even error distributions.",
    keyFindings: [
      "Relative Depth (83%): Consistent depth ordering in simple layouts.",
      "Stability (65%): Moderate stability assessment, showing mild overhang collapse bias.",
      "Orientation (50%): Matches average orientation capability across all open models.",
      "Lighting (83%): Robust feature extraction under dim illumination.",
    ],
    strengths: [
      "Quick inference on edge and server deployments",
      "Balanced performance across distinct reasoning types",
    ],
    weaknesses: [
      "Struggles with heavy object occlusion (>25% hidden)",
      "High-stack multi-tier statics calculation",
    ],
  },
};
