/** Display names for model ids in results tables. */
export const MODEL_LABEL: Record<string, string> = {
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3-flash-preview": "Gemini 3 Flash",
  "gemma-4-26b-a4b-it": "Gemma 4 26B (Google, open weights)",
  "@cf/meta/llama-4-scout-17b-16e-instruct": "Llama 4 Scout 17B (Meta, open weights)",
  "@cf/mistralai/mistral-small-3.1-24b-instruct": "Mistral Small 3.1 24B (Mistral AI, open weights)",
  "@cf/qwen/qwen3.8-27b": "Qwen3.8 27B (Alibaba, open weights)",
  "gpt-4o": "GPT-4o",
  "claude-sonnet-5-5": "Claude",
};
export const modelLabel = (id: string) => MODEL_LABEL[id] ?? id;
