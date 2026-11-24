/**
 * Identity of each evaluated model: who makes it and how it is released.
 * Deliberately no scores or findings here. Those are computed from the stored results
 * by lib/bench/insights.ts, so they can never drift from the data.
 */
export interface ModelMeta {
  name: string;
  company: string;
  kind: string;
  license: string;
}

export const MODEL_META: Record<string, ModelMeta> = {
  "gemini-3.1-flash-lite": { name: "Gemini 3.1 Flash-Lite", company: "Google", kind: "Proprietary multimodal model", license: "Gemini API" },
  "gemini-3.5-flash-lite": { name: "Gemini 3.5 Flash-Lite", company: "Google", kind: "Proprietary multimodal model", license: "Gemini API" },
  "gemma-4-26b-a4b-it": { name: "Gemma 4 26B", company: "Google", kind: "Open-weights multimodal model", license: "Open weights" },
  "@cf/qwen/qwen3.8-27b": { name: "Qwen3.8 27B", company: "Alibaba", kind: "Open-weights vision-language model", license: "Open weights" },
  "@cf/mistralai/mistral-small-3.1-24b-instruct": { name: "Mistral Small 3.1 24B", company: "Mistral AI", kind: "Open-weights vision-language model", license: "Apache 2.0" },
  "@cf/meta/llama-4-scout-17b-16e-instruct": { name: "Llama 4 Scout 17B-16E", company: "Meta", kind: "Open-weights mixture-of-experts model", license: "Llama 4 Community License" },
};

export const modelMeta = (id: string): ModelMeta => MODEL_META[id] ?? { name: id, company: "", kind: "Vision-language model", license: "" };
