export type Provider = "anthropic" | "openai" | "gemini" | "github";

export const MODELS: Record<Provider, { model: string; env: string; label: string }> = {
  anthropic: { model: "claude-sonnet-5-5", env: "ANTHROPIC_API_KEY", label: "Claude" },
  openai: { model: "gpt-4o", env: "OPENAI_API_KEY", label: "GPT-4o" },
  gemini: { model: "gemini-3.5-flash", env: "GEMINI_API_KEY", label: "Gemini" },
  // GitHub Models: OpenAI models through a GitHub token (free, rate-limited tier)
  github: { model: "openai/gpt-4o", env: "GITHUB_TOKEN", label: "GPT-4o (GitHub Models)" },
};

/** Every model the app can ask. Each answer is labelled with the model that actually produced it. */
export const MODEL_CHOICES: { id: string; provider: Provider; label: string }[] = [
  { id: "gemini-3.5-flash", provider: "gemini", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.5-flash-lite", provider: "gemini", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3-flash-preview", provider: "gemini", label: "Gemini 3 Flash" },
  { id: "gemini-3.1-flash-lite", provider: "gemini", label: "Gemini 3.1 Flash-Lite" },
  { id: "gemma-4-26b-a4b-it", provider: "gemini", label: "Gemma 4 26B (open)" },
  { id: "claude-sonnet-5-5", provider: "anthropic", label: "Claude" },
  { id: "openai/gpt-4o", provider: "github", label: "GPT-4o · GitHub Models" },
  { id: "gpt-4o", provider: "openai", label: "GPT-4o · OpenAI API" },
];

const LETTERS = "ABCDEF";

export function buildPrompt(question: string, options: string[]): string {
  return [
    "You are shown a rendered 3D scene. Answer the question using only what is visible in the image.",
    `Question: ${question}`,
    ...options.map((o, i) => `${LETTERS[i]}. ${o}`),
    "Reply with only the letter of the correct option.",
  ].join("\n");
}

/**
 * Reads the option letter from a model reply. Strict on purpose: a wrong parse silently corrupts the score.
 * Accepts "B", "B.", "(B)", "Answer: B", "The answer is C". Rejects ambiguous or out-of-range replies (returns null).
 */
export function parseChoice(raw: string, n: number): number | null {
  const text = raw.trim();
  const valid = (l: string) => {
    const i = LETTERS.indexOf(l.toUpperCase());
    return i >= 0 && i < n ? i : null;
  };
  // 1. an explicitly stated final answer ("The correct option is B", "Answer: D"); the last one wins
  const stated = Array.from(text.matchAll(/(?:answer|option)\s*(?:is|:)\s*\(?\**([A-F])\b/gi));
  if (stated.length) return valid(stated[stated.length - 1][1]);
  // 2. the whole reply is just a letter ("B", "B.", "(C)")
  const bare = text.match(/^\(?([A-F])\)?\.?$/i);
  if (bare) return valid(bare[1]);
  // 3. reasoning that ends on the letter ("... so B")
  const end = text.match(/\b([A-F])\)?\.?\s*$/);
  if (end && text.length > 3) return valid(end[1]);
  // 4. a reply that starts with the letter ("A. The red box")
  const lead = text.match(/^\(?([A-F])\)?[.:)\s]/i);
  if (lead) return valid(lead[1]);
  // 5. exactly one standalone capital option letter anywhere
  const upper = Array.from(new Set(text.match(/\b[A-F]\b/g) ?? []));
  return upper.length === 1 ? valid(upper[0]) : null;
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${text.slice(0, 300)}`), { status: res.status });
  try {
    return JSON.parse(text);
  } catch {
    // e.g. a proxy or firewall answering instead of the API
    throw new Error(`unexpected non-JSON reply from ${new URL(url).host}: "${text.slice(0, 60).trim()}". Is this host reachable from the server?`);
  }
}

export async function askModel(provider: Provider, apiKey: string, jpegBase64: string, question: string, options: string[], modelId?: string): Promise<string> {
  const prompt = buildPrompt(question, options);
  const model = modelId ?? MODELS[provider].model;
  if (provider === "anthropic") {
    const j = await post(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      {
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegBase64 } }, { type: "text", text: prompt }] }],
      }
    );
    return j.content?.[0]?.text ?? "";
  }
  if (provider === "openai" || provider === "github") {
    const j = await post(
      provider === "github" ? "https://models.github.ai/inference/chat/completions" : "https://api.openai.com/v1/chat/completions",
      { Authorization: `Bearer ${apiKey}` },
      { model, max_tokens: 16, temperature: 0, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpegBase64}` } }] }] }
    );
    return j.choices?.[0]?.message?.content ?? "";
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const parts = [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: jpegBase64 } }];
  const gen = { maxOutputTokens: 64, temperature: 0 };
  let j;
  try {
    // turn hidden "thinking" off so the short answer is not cut off; some models do not accept the setting
    j = await post(url, { "x-goog-api-key": apiKey }, { contents: [{ parts }], generationConfig: { ...gen, thinkingConfig: { thinkingBudget: 0 } } });
  } catch (e) {
    if ((e as { status?: number }).status !== 400) throw e;
    // models without the setting (e.g. Gemma) may write a sentence before the letter: give them room
    j = await post(url, { "x-goog-api-key": apiKey }, { contents: [{ parts }], generationConfig: { ...gen, maxOutputTokens: 2048 } });
  }
  return j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
}
