import { afterEach, describe, expect, it, vi } from "vitest";
import { maskKey, validKey, validModelId } from "../../lib/bench/byok";
import { classifyError } from "../../lib/bench/models";
import { POST as ask } from "../../app/api/bench/ask/route";
import { POST as testKey } from "../../app/api/bench/byok/test/route";

const FAKE = "sk-ant-api03-SECRETSECRETSECRET-wxyz";
const req = (url: string, body: unknown) => new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const reply = (status: number, body: unknown) => Promise.resolve(new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("BYOK input validation", () => {
  it("accepts real-looking keys and model ids", () => {
    expect(validKey(FAKE)).toBe(true);
    expect(validModelId("claude-sonnet-5-5")).toBe(true);
    expect(validModelId("google/gemma-4-31b-it:free")).toBe(true);
  });
  it("rejects keys and model ids that could break or abuse a request", () => {
    expect(validKey("short")).toBe(false);
    expect(validKey("has space inside the key")).toBe(false);
    expect(validModelId("../../etc/passwd?x=1")).toBe(false);
    expect(validModelId("model id with spaces")).toBe(false);
    expect(validModelId("")).toBe(false);
  });
  it("masks all but the last 4 characters", () => {
    expect(maskKey(FAKE)).toBe("••••wxyz");
    expect(maskKey(FAKE)).not.toContain("SECRET");
  });
});

describe("provider errors become readable messages", () => {
  const err = (status: number, body: unknown) => Object.assign(new Error(`${status} ${JSON.stringify(body)}`), { status });
  it.each([
    ["Anthropic", err(401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), "invalid_key", "Invalid key for Anthropic"],
    ["Google", err(400, { error: { code: 400, message: "API key not valid. Please pass a valid API key." } }), "invalid_key", "Invalid key for Google"],
    ["OpenAI", err(429, { error: { message: "You exceeded your current quota", code: "insufficient_quota" } }), "no_credit", "no credit"],
    ["OpenRouter", err(402, { error: { message: "Insufficient credits" } }), "no_credit", "no credit"],
    ["Google", err(429, { error: { message: "Resource has been exhausted", status: "RESOURCE_EXHAUSTED" } }), "rate_limit", "rate limit"],
    ["OpenAI", err(404, { error: { message: "The model `gpt-9` does not exist" } }), "model", "isn't available"],
  ])("%s %#", (label, e, kind, text) => {
    const r = classifyError(label as string, e, "gpt-9");
    expect(r.kind).toBe(kind);
    expect(r.message).toContain(text);
    expect(r.message).not.toMatch(/[{}]/); // no raw JSON
  });
  it("scrubs the key out of any message", () => {
    const r = classifyError("OpenAI", new Error(`500 {"error":{"message":"bad key ${FAKE}"}}`), undefined, FAKE);
    expect(r.message).not.toContain("SECRET");
  });
});

describe("routes never echo the visitor's key", () => {
  it("Test Key: an invalid key gives a clear message and no key in the response", async () => {
    vi.stubGlobal("fetch", vi.fn(() => reply(401, { type: "error", error: { type: "authentication_error", message: `invalid x-api-key ${FAKE}` } })));
    const res = await testKey(req("http://x/api/bench/byok/test", { provider: "anthropic", model: "claude-sonnet-5-5", apiKey: FAKE }));
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ ok: false, kind: "invalid_key", error: "Invalid key for Anthropic. Check it and retry." });
    expect(text).not.toContain("SECRET");
  });

  it("Test Key: a working key reports success, and the key goes only to the provider", async () => {
    const f = vi.fn((_url: string, _init?: RequestInit) => reply(200, { content: [{ type: "text", text: "OK" }] }));
    vi.stubGlobal("fetch", f);
    const res = await testKey(req("http://x/api/bench/byok/test", { provider: "anthropic", model: "claude-sonnet-5-5", apiKey: FAKE }));
    expect(await res.json()).toMatchObject({ ok: true, reply: "OK", keySource: "user" });
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).toBe("https://api.anthropic.com/v1/messages");
    expect((f.mock.calls[0][1]!.headers as Record<string, string>)["x-api-key"]).toBe(FAKE);
  });

  it("ask: uses the visitor's key for that request and reports it, without echoing it", async () => {
    const f = vi.fn((_url: string, _init?: RequestInit) => reply(200, { content: [{ type: "text", text: "A" }] }));
    vi.stubGlobal("fetch", f);
    const res = await ask(req("http://x/api/bench/ask", { provider: "anthropic", model: "claude-sonnet-5-5", apiKey: FAKE, kind: "stability", seed: 4, objects: 2, lighting: "normal" }));
    const text = await res.text();
    const j = JSON.parse(text);
    expect(j.keySource).toBe("user");
    expect(j.raw).toBe("A");
    expect(text).not.toContain("SECRET");
    // the answer never travels to the model: only image + question
    const sent = String(f.mock.calls[0][1]!.body);
    expect(sent).not.toMatch(/centre of mass|Rule:|ground truth/i);
  }, 30000);

  it("ask: rejects malformed model ids before calling any provider", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = await ask(req("http://x/api/bench/ask", { provider: "openai", model: "../../x?y=1", apiKey: FAKE, kind: "closer", seed: 1 }));
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
});
