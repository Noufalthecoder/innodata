// node scripts/demo/assemble.mjs  ->  demo-output/SpatialGrid-demo.mp4
// Frames + voice-over + zoom-to-cursor on clicks + burned-in subtitles, encoded with ffmpeg.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const FFMPEG = process.env.FFMPEG_PATH || env.match(/^FFMPEG_PATH=(.*)$/m)?.[1]?.trim() || "ffmpeg";
const OUT = "demo-output";
const tl = JSON.parse(readFileSync(`${OUT}/timeline.json`, "utf8"));
const vo = JSON.parse(readFileSync(`${OUT}/vo/manifest.json`, "utf8"));
const END = tl.end;
const f3 = (n) => n.toFixed(3);

// ---------- 1. frames -> timed image list ----------
const frames = tl.frames.slice().sort((a, b) => a.t - b.t).filter((f) => f.t < END);
let list = "ffconcat version 1.0\n";
frames.forEach((f, i) => {
  const start = i === 0 ? 0 : f.t;
  const next = i + 1 < frames.length ? frames[i + 1].t : END;
  list += `file 'frames/${f.name}'\nduration ${f3(Math.max(0.001, next - start))}\n`;
});
list += `file 'frames/${frames.at(-1).name}'\n`;
writeFileSync(`${OUT}/frames.ffconcat`, list);

// ---------- 2. zoom toward the cursor on clicks and focus moments ----------
const windows = [];
for (const e of tl.events) {
  const w = e.kind === "click"
    ? { a: e.t - 0.45, b: e.t - 0.05, c: e.t + 1.05, d: e.t + 1.55, k: 0.5, x: e.x, y: e.y }
    : { a: e.t - 0.15, b: e.t + 0.55, c: e.t + 2.3, d: e.t + 2.9, k: 0.4, x: e.x, y: e.y };
  const prev = windows.at(-1);
  if (prev && w.a < prev.d + 0.15) continue; // keep zooms separate and calm
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
writeFileSync(`${OUT}/subs.ass`, ass);

// ---------- 4. filter graph ----------
const inputs = ["-f", "concat", "-safe", "0", "-i", "frames.ffconcat"];
const delays = [];
tl.segments.forEach((s, i) => {
  inputs.push("-i", `vo/${s.id}.wav`);
  const ms = Math.round(s.start * 1000);
  delays.push(`[${i + 1}:a]aresample=48000,adelay=${ms}:all=1[a${i}]`);
});
const graph = [
  `[0:v]fps=30,scale=3840:2160:flags=lanczos,zoompan=z='${Z}':x='clip((${CX})*iw/1920-iw/zoom/2,0,iw-iw/zoom)':y='clip((${CY})*ih/1080-ih/zoom/2,0,ih-ih/zoom)':d=1:s=1920x1080:fps=30,ass=subs.ass,format=yuv420p[v]`,
  ...delays,
  `${tl.segments.map((_, i) => `[a${i}]`).join("")}amix=inputs=${tl.segments.length}:normalize=0:dropout_transition=0,apad,atrim=0:${f3(END)},loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
].join(";\n");
writeFileSync(`${OUT}/graph.txt`, graph);

const args = ["-y", "-hide_banner", "-loglevel", "error", "-stats", ...inputs, "-/filter_complex", "graph.txt", "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f3(END), "SpatialGrid-demo.mp4"];
console.log(`assembling ${END.toFixed(1)}s, ${frames.length} frames, ${windows.length} zooms, ${tl.segments.length} voice clips`);
const r = spawnSync(FFMPEG, args, { cwd: OUT, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`wrote ${OUT}/SpatialGrid-demo.mp4`);
