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
  args: ["--hide-scrollbars", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--force-color-profile=srgb"],
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

// ---------- warm up the pages so nothing loads slowly on camera ----------
for (const p of ["/", "/app"]) await page.goto(BASE + p, { waitUntil: "networkidle" });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.mouse.move(mx, my);
t0 = Date.now() / 1000;
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await sleep(300);

// ---------- the film ----------
await segment("s0", async (d) => {
  await card("SpatialGrid", "A spatial &amp; pose reasoning benchmark for physical AI");
  await sleep(d * 1000 - 300);
  await uncard();
});

await segment("s1", async (d) => {
  await sleep(600);
  await focus(page.locator("h1").first(), { dy: 10 });
  await sleep(d * 1000 * 0.35);
  const why = await page.locator("#why").evaluate((el) => el.getBoundingClientRect().top + scrollY - 40);
  await smoothScrollTo(why, 2600);
  await sleep(500);
  await focus(page.locator("#why h3").first(), { dx: -40 });
});

await segment("s2", async () => {
  await click(page.locator("header a", { hasText: "Open app" }));
  await page.waitForURL("**/app**");
  await page.mouse.move(mx, my);
  await page.locator("h1").waitFor();
  await sleep(500);
  await click(appTab("Tasks"));
  await page.locator(`main button:has-text("${hero.id} ·")`).waitFor();
  await sleep(700);
  await click(page.locator(`main button:has-text("${hero.id} ·")`));
  await page.locator("main img").first().waitFor();
  await sleep(800);
  await focus(page.locator("main img").first(), { ms: 900 });
});

await segment("s3", async () => {
  await click(page.getByRole("button", { name: "Interactive 3D" }));
  await page.locator("canvas").waitFor();
  maxSteps = 8;
  await sleep(1500);
  const [cx, cy] = await centerOf(page.locator("canvas"));
  await moveTo(cx + 120, cy + 40, 500);
  await page.mouse.down();
  await moveTo(cx - 220, cy + 10, 1000);
  await page.mouse.up();
  await sleep(700);
  await click(page.getByRole("button", { name: /ground truth/ }));
  await sleep(900);
  await click(page.getByRole("button", { name: /ground truth/ }));
  maxSteps = 24;
});

await segment("s4", async () => {
  maxSteps = 24;
  await click(page.getByRole("button", { name: "Rendered image" }), { zoom: false });
  await sleep(600);
  await focus(page.getByText("Visibility check").first(), { dx: 120, dy: 26, ms: 900 });
});

await segment("s5", async () => {
  await click(page.getByText("← Back to all tasks"), { zoom: false });
  await page.getByRole("button", { name: "orientation", exact: true }).waitFor();
  await sleep(400);
  await focus(page.getByRole("button", { name: "leftmost", exact: true }), { ms: 600 });
  for (const k of ["orientation", "stability", "all"]) {
    await click(page.getByRole("button", { name: k, exact: true }), { zoom: false, ms: 400 });
    await sleep(800);
  }
});

await segment("s6", async () => {
  await click(appTab("Play"));
  await page.locator("main img").first().waitFor();
  await sleep(500);
  await click(page.locator('[aria-label="Answer options"] button').first());
  await sleep(900);
  await click(appTab("Generate"));
  await page.locator("select").first().selectOption("stability");
  await sleep(300);
  await click(page.getByRole("button", { name: /Generate a new scene/ }));
  await page.locator("main img").first().waitFor({ timeout: 60000 });
  await sleep(400);
  await click(page.locator('[aria-label="Answer options"] button').first());
});

await segment("s7", async () => {
  await click(appTab("Validate"));
  await sleep(200);
  await click(page.getByRole("button", { name: "Run validation" }));
  await page.getByText("Tasks in dataset").waitFor({ timeout: 180000 });
  await sleep(400);
  await focus(page.getByText("Answers re-derived").first(), { dx: 260, ms: 800 });
});

await segment("s8", async () => {
  await click(appTab("Results"));
  await page.locator("table").waitFor();
  await sleep(700);
  await focus(page.locator("tbody tr").first(), { dx: -150, ms: 900 });
  const rows = await page.locator("tbody tr").count();
  for (let i = 1; i < rows; i++) {
    await sleep(1300);
    const [x, y] = await centerOf(page.locator("tbody tr").nth(i));
    await moveTo(x - 150, y, 500);
  }
});

await segment("s9", async (d) => {
  await card("SpatialGrid", "github.com/Noufalthecoder/innodata");
  await sleep(d * 1000 + 600);
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
