// node scripts/demo/assemble.mjs  ->  demo-output/SpatialGrid-demo.mp4
// Frames + voice-over + zoom-to-cursor on clicks + burned-in subtitles, encoded with ffmpeg.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const FFMPEG = process.env.FFMPEG_PATH || env.match(/^FFMPEG_PATH=(.*)$/m)?.[1]?.trim() || "ffmpeg";
const OUT = "demo-output";
// DEMO_PART=dataset encodes only the extra scene; DEMO_JOIN=1 only joins the finished parts
const PART = process.env.DEMO_PART || "main";
const SUF = PART === "main" ? "" : `-${PART}`;
const tl = JSON.parse(readFileSync(`${OUT}/timeline${SUF}.json`, "utf8"));
const vo = JSON.parse(readFileSync(`${OUT}/vo/manifest.json`, "utf8"));
const END = tl.end;
const f3 = (n) => n.toFixed(3);

// ---------- 1. frames -> timed image list ----------
const frames = tl.frames.slice().sort((a, b) => a.t - b.t).filter((f) => f.t >= 0 && f.t < END);
let list = "ffconcat version 1.0\n";
frames.forEach((f, i) => {
  const start = i === 0 ? 0 : f.t;
  const next = i + 1 < frames.length ? frames[i + 1].t : END;
  list += `file 'frames${SUF}/${f.name}'\nduration ${f3(Math.max(0.001, next - start))}\n`;
});
list += `file 'frames${SUF}/${frames.at(-1).name}'\n`;
writeFileSync(`${OUT}/frames${SUF}.ffconcat`, list);

// ---------- 2. zoom toward the cursor on clicks and focus moments ----------
const windows = [];
for (const e of tl.events) {
  const w = e.kind === "click"
    ? { a: e.t - 0.45, b: e.t - 0.05, c: e.t + 1.05, d: e.t + 1.55, k: 0.5, x: e.x, y: e.y }
    : { a: e.t - 0.15, b: e.t + 0.55, c: e.t + 2.3, d: e.t + 2.9, k: 0.4, x: e.x, y: e.y };
  const prev = windows.at(-1);
  if (prev && w.a < prev.d + 0.15) continue; // keep zooms separate and calm
  // never zoom into the closing title card (main recording only): end the zoom before the last segment starts
  const lastStart = PART === "main" ? tl.segments.at(-1).start : Infinity;
  if (w.a >= lastStart - 0.6) continue;
  if (w.d > lastStart - 0.1) {
    w.d = lastStart - 0.1;
    w.c = Math.max(w.b + 0.2, w.d - 0.5);
  }
  windows.push(w);
}
const env_ = (w) => `(st(0,min(clip((it-${f3(w.a)})/${f3(w.b - w.a)},0,1),clip((${f3(w.d)}-it)/${f3(w.d - w.c)},0,1)));ld(0)*ld(0)*(3-2*ld(0)))`;
const Z = windows.length ? `1+${windows.map((w) => `${w.k}*${env_(w)}`).join("+")}` : "1";
const CX = `960${windows.map((w) => `+${f3(w.x - 960)}*between(it,${f3(w.a)},${f3(w.d)})`).join("")}`;
const CY = `540${windows.map((w) => `+${f3(w.y - 540)}*between(it,${f3(w.a)},${f3(w.d)})`).join("")}`;

// ---------- 3. subtitles (timed to each voice-over clip) ----------
const ts = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`;
};
function chunks(text) {
  const out = [];
  for (const sentence of text.match(/[^.!?]+[.!?]+/g) ?? [text]) {
    const words = sentence.trim().split(/\s+/);
    if (words.length <= 13) { out.push(words.join(" ")); continue; }
    // split long sentences at a comma near the middle, else evenly
    const parts = sentence.trim().split(/(?<=,)\s+/);
    let cur = [];
    for (const p of parts) {
      const pw = p.split(/\s+/);
      if (cur.length && cur.length + pw.length > 13) { out.push(cur.join(" ")); cur = []; }
      cur.push(...pw);
      while (cur.length > 13) out.push(cur.splice(0, 11).join(" "));
    }
    if (cur.length) out.push(cur.join(" "));
  }
  return out;
}
let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Segoe UI Semibold,44,&H00FFFFFF,&H00FFFFFF,&H64000000,&H64000000,0,0,0,0,100,100,0,0,3,16,0,2,200,200,64,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
for (const seg of tl.segments) {
  const parts = chunks(vo[seg.id].text);
  const total = parts.reduce((a, p) => a + p.length, 0);
  let t = seg.start + 0.05;
  for (const p of parts) {
    const d = (vo[seg.id].seconds * p.length) / total;
    ass += `Dialogue: 0,${ts(t)},${ts(Math.min(t + d, END))},Sub,,0,0,0,,${p}\n`;
    t += d;
  }
}
writeFileSync(`${OUT}/subs${SUF}.ass`, ass);

// ---------- 4. filter graph ----------
const inputs = ["-f", "concat", "-safe", "0", "-i", `frames${SUF}.ffconcat`];
const delays = [];
tl.segments.forEach((s, i) => {
  inputs.push("-i", `vo/${s.id}.wav`);
  const ms = Math.round(s.start * 1000);
  delays.push(`[${i + 1}:a]aresample=48000,adelay=${ms}:all=1[a${i}]`);
});
const graph = [
  `[0:v]fps=30,scale=3840:2160:flags=lanczos,zoompan=z='${Z}':x='clip((${CX})*iw/1920-iw/zoom/2,0,iw-iw/zoom)':y='clip((${CY})*ih/1080-ih/zoom/2,0,ih-ih/zoom)':d=1:s=1920x1080:fps=30,ass=subs${SUF}.ass,format=yuv420p[v]`,
  ...delays,
  `${tl.segments.map((_, i) => `[a${i}]`).join("")}amix=inputs=${tl.segments.length}:normalize=0:dropout_transition=0,apad,atrim=0:${f3(END)},loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
].join(";\n");
writeFileSync(`${OUT}/graph${SUF}.txt`, graph);

const args = ["-y", "-hide_banner", "-loglevel", "error", "-stats", ...inputs, "-/filter_complex", `graph${SUF}.txt`, "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", "-t", f3(END), PART === "main" ? "app-part.mp4" : `${PART}-part.mp4`];
if (!process.env.DEMO_JOIN) {
console.log(`assembling ${END.toFixed(1)}s, ${frames.length} frames, ${windows.length} zooms, ${tl.segments.length} voice clips`);
const r = spawnSync(FFMPEG, args, { cwd: OUT, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
}
if (PART !== "main") {
  console.log(`wrote ${OUT}/${PART}-part.mp4 (${END.toFixed(1)} s)`);
  process.exit(0);
}

// ---------- 5. the team's explainer as the opening, narrated with s0 ----------
// The explainer ends on a stand-in logo at 27.9 s; it is cut just before that, so the film goes straight to the SpatialGrid title.
const INTRO_END = Number(process.env.DEMO_INTRO_END || 27.8);
const NARRATION_AT = 0.8;
let introAss = ass.slice(0, ass.indexOf("[Events]")) + "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";
{
  const parts = chunks(vo.s0.text);
  const total = parts.reduce((a, p) => a + p.length, 0);
  let t = NARRATION_AT;
  for (const p of parts) {
    const d = (vo.s0.seconds * p.length) / total;
    introAss += `Dialogue: 0,${ts(t)},${ts(Math.min(t + d, INTRO_END))},Sub,,0,0,0,,${p}\n`;
    t += d;
  }
}
writeFileSync(`${OUT}/subs_intro.ass`, introAss);
const introGraph = [
  `[0:v]trim=0:${INTRO_END},setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,fps=30,ass=subs_intro.ass,fade=t=out:st=${f3(INTRO_END - 0.45)}:d=0.45,format=yuv420p[v]`,
  `[0:a]atrim=0:${INTRO_END},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.35[bg]`,
  `[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(NARRATION_AT * 1000)}:all=1[n]`,
  `[bg][n]amix=inputs=2:normalize=0:dropout_transition=0,apad,atrim=0:${INTRO_END},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`,
].join(";\n");
writeFileSync(`${OUT}/graph_intro.txt`, introGraph);
const ri = process.env.DEMO_JOIN ? { status: 0 } : spawnSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", "-i", "intro.mp4", "-i", "vo/s0.wav", "-/filter_complex", "graph_intro.txt", "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "intro-part.mp4"], { cwd: OUT, stdio: "inherit" });
if (ri.status !== 0) process.exit(ri.status ?? 1);

// ---------- 6. join: explainer, the live product, the dataset scene, then the closing card ----------
const hasDataset = existsSync(`${OUT}/dataset-part.mp4`);
const CUT = tl.segments.at(-1).start; // the closing card starts here
// trim the silent wait while the models answer: keep 3 s after the s5 line, and 1.5 s before s6
const s5 = tl.segments.find((x) => x.id === "s5");
const s6 = tl.segments.find((x) => x.id === "s6");
const gapA = s5 ? s5.start + vo.s5.seconds + 3 : 0;
const gapB = s6 ? s6.start - 1.5 : 0;
const trimGap = gapB - gapA > 2;
const pieces = trimGap ? [[0, gapA], [gapB, CUT]] : [[0, CUT]];
const parts = [];
const lines = [`[1:v]split=${pieces.length + 1}${pieces.map((_, i) => `[v${i}]`).join("")}[vend]`, `[1:a]asplit=${pieces.length + 1}${pieces.map((_, i) => `[a${i}]`).join("")}[aend]`];
pieces.forEach(([from, to], i) => {
  lines.push(`[v${i}]trim=${f3(from)}:${f3(to)},setpts=PTS-STARTPTS[pv${i}]`, `[a${i}]atrim=${f3(from)}:${f3(to)},asetpts=PTS-STARTPTS[pa${i}]`);
  parts.push(`[pv${i}][pa${i}]`);
});
// the closing card fades in over the previous page; start its picture once it is opaque and hold that frame, so nothing flashes
// between the dataset scene and the card, while the card's narration still starts on time
const CARD_IN = 0.9;
lines.push(`[vend]trim=${f3(CUT + CARD_IN)},setpts=PTS-STARTPTS,tpad=start_duration=${CARD_IN}:start_mode=clone[ve]`, `[aend]atrim=${f3(CUT)},asetpts=PTS-STARTPTS[ae]`);
const seq = ["[0:v][0:a]", ...parts, ...(hasDataset ? ["[2:v][2:a]"] : []), "[ve][ae]"];
lines.push(`${seq.join("")}concat=n=${seq.length}:v=1:a=1[v][a]`);
const joinGraph = lines.join(";");
const rc = spawnSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", "-i", "intro-part.mp4", "-i", "app-part.mp4", ...(hasDataset ? ["-i", "dataset-part.mp4"] : []),
  "-filter_complex", joinGraph, "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "SpatialGrid-demo.mp4"], { cwd: OUT, stdio: "inherit" });
if (rc.status !== 0) process.exit(rc.status ?? 1);
console.log(`wrote ${OUT}/SpatialGrid-demo.mp4 (${(INTRO_END + END).toFixed(1)} s)`);
