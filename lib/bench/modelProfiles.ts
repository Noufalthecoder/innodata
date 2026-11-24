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
      "Best of the Google models (81.7%, tied 2nd of six) with near-perfect depth ordering, but collapses into a front-facing bias on 3D orientation.",
    keyFindings: [
      "Depth & Position (97%): Correct on 29 of 30 relative distance and pinhole projection tasks.",
      "Orientation (50%): Answered 'toward the camera' 7 out of 10 times, never selecting 'left' or 'right' even when correct.",
      "Stability (75%): Successfully caught all 10 unstable stacks, but falsely predicted collapse on 5 stable stacks.",
      "Dim light (100%): All 12 dim-light tasks correct, consistent with its errors coming from spatial reasoning rather than visibility.",
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
    license: "Open weights (Gemma Terms)",
    headline:
      "Superior 3D pose extraction (70%) and flawless depth ordering (100%), but crippled by extreme false-alarm collapse bias on physical stability (55%).",
    keyFindings: [
      "Depth & Position (100%): Flawless 30/30 score on closest-object and leftmost-object spatial tests.",
      "Orientation (70%): Highest orientation score of all six models, and the only one that ever answered 'to the right'.",
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
      "Best stability score among the Google models (80%), but total mode collapse on 3D container orientation (20%, below random chance).",
    keyFindings: [
      "Stability (80%): Caught all 10 unstable stacks and recognised 6 of 10 stable ones; Qwen and Mistral reach 95% on the same tasks.",
      "Orientation (20%): Fell below the 25% random guessing floor. Answered 'toward the camera' in 9 out of 10 orientation trials.",
      "Relative Depth (90%): High overall accuracy with occasional sensitivity to partial occlusion.",
      "Dim light (83%): No consistent drop compared with normal light.",
    ],
    strengths: [
      "Catches every unstable stack",
      "Left-most position (100%)",
    ],
    weaknesses: [
      "Severe mode collapse on container orientation (9 of 10 answers 'toward the camera')",
      "Calls 4 of 10 stable stacks unstable",
    ],
  },
  "@cf/qwen/qwen3.8-27b": {
    id: "@cf/qwen/qwen3.8-27b",
    name: "Qwen3.8 27B (Alibaba)",
    architecture: "Open-weights vision-language model",
    license: "Open weights (Alibaba)",
    headline:
      "Highest overall accuracy of all six models (88.3%): near-perfect depth and stability, but the same orientation blind spot as everyone else.",
    keyFindings: [
      "Stability (95%): Recognised all 10 stable stacks and caught 9 of 10 unstable ones, with no collapse bias.",
      "Depth & Position (97%): 29 of 30 correct; left-most 100%.",
      "Orientation (50%): Answered 'toward' 7 times and 'away' 3 times; never 'left' or 'right'.",
      "Dim light (92%): No consistent drop compared with normal light.",
    ],
    strengths: ["Centre-of-mass stability judgement", "Depth ordering under occlusion", "Highest score overall"],
    weaknesses: ["Never answers left or right on orientation", "Needs hidden reasoning switched off to answer within budget"],
  },
  "@cf/mistralai/mistral-small-3.1-24b-instruct": {
    id: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1 24B (Mistral AI)",
    architecture: "Open-weights vision-language model",
    license: "Apache 2.0 (open weights)",
    headline: "Joint 2nd overall (81.7%) with 95% on stability, but only 30% on orientation.",
    keyFindings: [
      "Stability (95%): Recognised all 10 stable stacks and caught 9 of 10 unstable ones.",
      "Depth & Position (90%): Left-most 100%, closest 85%.",
      "Orientation (30%): Answered 'toward the camera' 9 times out of 10.",
      "Dim light (75%): Slightly lower than in normal light (83%).",
    ],
    strengths: ["Balanced stability judgement", "Left-most position (100%)"],
    weaknesses: ["Strong 'toward the camera' bias on orientation", "Some depth errors with several objects"],
  },
  "@cf/meta/llama-4-scout-17b-16e-instruct": {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B (Meta)",
    architecture: "Open-weights mixture-of-experts vision-language model",
    license: "Llama 4 Community License (open weights)",
    headline: "Strong on stability (90%) but weakest overall (70.0%), mainly from depth errors and a fixed orientation answer.",
    keyFindings: [
      "Stability (90%): Recognised all 10 stable stacks; caught 8 of 10 unstable ones.",
      "Depth & Position (67%): Only 60% on 'closest to the camera', the lowest of all six models.",
      "Orientation (40%): Answered 'away from the camera' for all 10 tasks.",
      "Dim light (75%): No consistent drop compared with normal light (69%).",
    ],
    strengths: ["No collapse bias on stable stacks", "Left-most position (80%)"],
    weaknesses: ["Depth ordering", "Answers 'away from the camera' regardless of the scene"],
  },
};
