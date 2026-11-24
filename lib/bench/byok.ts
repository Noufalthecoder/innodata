/**
 * Bring Your Own Key: the providers and models a visitor can run with their own API key.
 * Shared by the browser and the server; contains no secrets.
 */
import type { Provider } from "./models";

export type ByokProvider = "anthropic" | "openai" | "gemini" | "openrouter";

export const BYOK_PROVIDERS: { id: ByokProvider; label: string; keyHint: string; keyUrl: string; models: { id: string; label: string }[] }[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    keyHint: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
      { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keyHint: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  {
    id: "gemini",
    label: "Google",
    keyHint: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
      { id: "gemma-4-26b-a4b-it", label: "Gemma 4 26B" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyHint: "sk-or-…",
    keyUrl: "https://openrouter.ai/keys",
    // replaced at runtime by OpenRouter's live list of image-capable models
    models: [
      { id: "openai/gpt-4o", label: "openai/gpt-4o" },
      { id: "anthropic/claude-sonnet-5.5", label: "anthropic/claude-sonnet-5.5" },
      { id: "google/gemini-3.5-flash", label: "google/gemini-3.5-flash" },
    ],
  },
];

export const byokProvider = (id: string) => BYOK_PROVIDERS.find((p) => p.id === id);

/** model ids are passed to provider APIs, so only allow the characters real ids use */
export const validModelId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9._:/@-]{1,120}$/.test(id);

/** a pasted key: printable, no spaces, sane length */
export const validKey = (k: unknown): k is string => typeof k === "string" && /^[\x21-\x7e]{8,300}$/.test(k);

/** for any message that might be shown or logged: never more than the last 4 characters of a key */
export const maskKey = (k: string) => (k.length > 8 ? `••••${k.slice(-4)}` : "••••");

export const asProvider = (p: ByokProvider): Provider => p;
