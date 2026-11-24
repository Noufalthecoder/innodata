// node scripts/demo/record.mjs [baseUrl]
// Drives the real site and app in a browser, timed to the voice-over, and captures full-quality frames.
// Writes demo-output/frames/*.jpg and demo-output/timeline.json (segment starts, clicks for zoom, frame times).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://localhost:3100";
const OUT = "demo-output";
const FR = `${OUT}/frames`;
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });
const vo = JSON.parse(readFileSync(`${OUT}/vo/manifest.json`, "utf8"));
const tasks = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
const hero = tasks.find((t) => t.kind === "closer" && t.difficulty.objects >= 4 && t.difficulty.lighting === "normal") ?? tasks[0];

const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const W = 1920, H = 1080;

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  // the real GPU: software rendering (SwiftShader) drops the 3D canvas to under 1 fps
  args: ["--hide-scrollbars", "--ignore-gpu-blocklist", "--force-color-profile=srgb"],
});
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

// visible cursor + click ripple (headless browsers draw no cursor)
await context.addInitScript(() => {
  const install = () => {
    document.documentElement.style.scrollBehavior = "auto";
    if (document.getElementById("__cur")) return;
    const c = document.createElement("div");
    c.id = "__cur";
    c.innerHTML = '<svg width="30" height="30" viewBox="0 0 28 28"><path d="M4 2 L4 22 L9.5 16.5 L13 25 L16.5 23.5 L13 15 L21 15 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none", transform: `translate(${window.__cx ?? -100}px,${window.__cy ?? -100}px)`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.55))" });
    document.documentElement.appendChild(c);
    addEventListener("mousemove", (e) => { c.style.transform = `translate(${e.clientX - 4}px,${e.clientY - 2}px)`; }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      Object.assign(r.style, { position: "fixed", left: `${e.clientX - 24}px`, top: `${e.clientY - 24}px`, width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #ff8731", zIndex: "2147483646", pointerEvents: "none", transition: "transform .55s ease-out, opacity .55s ease-out", transform: "scale(.3)", opacity: "1" });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = "scale(1.5)"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 650);
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
});

const page = await context.newPage();
let t0 = Date.now() / 1000;
const now = () => Date.now() / 1000 - t0;

// full-quality frame capture
const cdp = await context.newCDPSession(page);
const frames = [];
let fi = 0;
cdp.on("Page.screencastFrame", async (f) => {
  const name = `f${String(fi++).padStart(6, "0")}.jpg`;
  writeFileSync(`${FR}/${name}`, Buffer.from(f.data, "base64"));
  frames.push({ name, ts: f.metadata.timestamp, arrival: Date.now() / 1000 });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
});

const events = []; // {t, x, y, kind}
const segments = []; // {id, start, seconds}
let mx = 1500, my = 760;

let maxSteps = 24;
async function moveTo(x, y, ms = 650) {
  const sx = mx, sy = my;
  const n = Math.min(maxSteps, Math.max(8, Math.round(ms / 16)));
  for (let i = 1; i <= n; i++) {
    const p = i / n, e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    mx = sx + (x - sx) * e;
    my = sy + (y - sy) * e;
    await page.mouse.move(mx, my);
    await sleep(ms / n);
  }
}
async function centerOf(loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
}
async function click(loc, { zoom = true, ms = 650 } = {}) {
  const [x, y] = await centerOf(loc);
  await moveTo(x, y, ms);
  await sleep(160);
  if (zoom) events.push({ t: now(), x, y, kind: "click" });
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
}
async function focus(loc, { dx = 0, dy = 0, ms = 700 } = {}) {
  const [x, y] = await centerOf(loc);
  await moveTo(x + dx, y + dy, ms);
  events.push({ t: now(), x: x + dx, y: y + dy, kind: "focus" });
}
async function smoothScrollTo(y, ms) {
  await page.evaluate(({ y, ms }) => new Promise((res) => {
    const s = scrollY, d = y - s, st = performance.now();
    const f = (t) => { const p = Math.min(1, (t - st) / ms), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2; scrollTo(0, s + d * e); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), { y, ms });
}
async function card(title, sub) {
  await page.evaluate(([t, s]) => {
    const d = document.createElement("div");
    d.id = "__card";
    d.innerHTML = `<div style="font:600 112px Inter,Segoe UI,system-ui;letter-spacing:-.03em;color:#fff">${t}</div><div style="margin-top:26px;font:400 36px Inter,Segoe UI,system-ui;color:#a1a1aa">${s}</div><div style="margin-top:44px;width:140px;height:4px;background:#ff8731;border-radius:2px"></div>`;
    Object.assign(d.style, { position: "fixed", inset: "0", background: "#08090c", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: "2147483640", opacity: "0", transition: "opacity .7s ease" });
    document.body.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => (d.style.opacity = "1")));
  }, [title, sub]);
}
async function uncard() {
  await page.evaluate(() => { const d = document.getElementById("__card"); if (d) { d.style.opacity = "0"; setTimeout(() => d.remove(), 800); } });
}
async function segment(id, fn) {
  const start = now();
  const seconds = vo[id].seconds;
  segments.push({ id, start, seconds });
  await fn(seconds);
  await sleep((start + seconds + 0.5 - now()) * 1000);
  console.log(`${id} done at ${now().toFixed(1)}s`);
}
const appTab = (name) => page.locator('nav[aria-label="App sections"] button', { hasText: name });

// ---------- warm up the pages so nothing compiles or loads slowly on camera ----------
for (const p of ["/", "/app"]) await page.goto(BASE + p, { waitUntil: "networkidle" });
// one real, full validation run before filming, so the panel opens on a genuine result without a long wait on camera
await page.evaluate((b) => fetch(b + "/api/bench/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fresh: true }) }).then((r) => r.json()), BASE);
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.mouse.move(mx, my);
t0 = Date.now() / 1000;
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await sleep(300);

const top = (name) => page.locator("header button", { hasText: name }).first();
const node = (type) => page.locator(`.react-flow__node-${type}`).first();

// ---------- the film (s0 plays over the team's explainer, joined in assemble.mjs) ----------
await segment("s1", async (d) => {
  await card("SpatialGrid", "Team Hackcrew · a benchmark factory for physical AI");
  await sleep(4200);
  await uncard();
  await sleep(1200);
  await focus(page.locator("h1").first(), { dy: 10, ms: 900 });
});

await segment("s2", async () => {
  await sleep(300);
  await focus(page.locator("figure ul").first(), { ms: 900 });
  await sleep(4200);
  await focus(page.locator("figure ul li").last(), { dx: 80, ms: 700 });
});

await segment("s3", async () => {
  await click(page.locator("header a", { hasText: "Open app" }));
  await page.waitForURL("**/app**");
  await page.mouse.move(mx, my);
  await node("config").waitFor();
  await sleep(1800);
  await click(page.getByRole("button", { name: /Generate Task/ }));
  await page.getByText("Held back").waitFor({ timeout: 60000 });
  await sleep(600);
  await focus(node("truth"), { ms: 800 });
  await sleep(2600);
  await focus(node("visibility"), { ms: 700 });
});

await segment("s4", async () => {
  await click(page.getByRole("button", { name: /Run$/ }));
  await sleep(2500);
  await focus(node("config"), { ms: 900 });
});

await segment("s5", async () => {
  // the models answer at their own speed; the segment waits for every lane
  await page.waitForFunction(() => !document.body.innerText.includes("Running…"), null, { timeout: 150000 });
  await sleep(700);
  await focus(node("results"), { ms: 900 });
});

await segment("s6", async () => {
  await click(top("Validation Proof"));
  await page.getByText("All checks passed").waitFor({ timeout: 120000 });
  await sleep(500);
  await focus(page.locator("section[role=dialog] .grid > div").first(), { ms: 800 });
  await sleep(3500);
  const howTo = await page.locator("section[role=dialog]").evaluate((el) => el.scrollTop + 520);
  await page.locator("section[role=dialog]").evaluate((el, y) => el.scrollTo({ top: y, behavior: "smooth" }), howTo);
});

await segment("s7", async () => {
  await click(top("Leaderboard"));
  const dlg = page.locator("section[role=dialog]");
  await dlg.locator("tbody tr").first().waitFor({ timeout: 30000 });
  await sleep(600);
  await focus(dlg.locator("tbody tr").first(), { dx: -300, ms: 800 });
  await sleep(3500);
  await click(dlg.locator("tr", { hasText: "Gemma 4 26B" }).first());
  await page.getByText("Accuracy by skill").waitFor({ timeout: 30000 });
  await sleep(800);
  await focus(page.getByText("Accuracy by skill"), { dx: 300, dy: 60, ms: 800 });
  await sleep(3500);
  await dlg.evaluate((el) => el.scrollTo({ top: 760, behavior: "smooth" }));
  await sleep(1200);
  await focus(page.getByText("Stable stacks recognised").first(), { ms: 800 });
});

await segment("s8", async (d) => {
  await card("SpatialGrid", "Team Hackcrew · github.com/Noufalthecoder/innodata");
  await sleep(d * 1000 + 800);
});

const end = now();
await cdp.send("Page.stopScreencast");
await browser.close();

// frame timestamps: CDP gives seconds since epoch; fall back to arrival time if the clock looks different
const offs = frames.map((f) => f.arrival - f.ts).sort((a, b) => a - b);
const useTs = Math.abs(offs[Math.floor(offs.length / 2)]) < 1;
for (const f of frames) f.t = (useTs ? f.ts : f.arrival) - t0;
writeFileSync(`${OUT}/timeline.json`, JSON.stringify({ end, segments, events, frames, clock: useTs ? "cdp" : "arrival" }, null, 1));
console.log(`recorded ${frames.length} frames, ${end.toFixed(1)}s, ${events.length} zoom events (clock: ${useTs ? "cdp" : "arrival"})`);
