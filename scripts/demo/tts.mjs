// node scripts/demo/tts.mjs  ->  demo-output/vo/<id>.wav + manifest.json
// Voice-over with Gemini text-to-speech. Cached: a segment is only re-synthesised when its text changes.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildSegments } from "./segments.mjs";

const OUT = "demo-output/vo";
mkdirSync(OUT, { recursive: true });
const key = readFileSync(".env.local", "utf8").match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim();
if (!key) throw new Error("GEMINI_API_KEY missing in .env.local");
// one model for every clip keeps the voice consistent; the others are fallbacks
const MODELS = (process.env.DEMO_TTS_MODEL ? [process.env.DEMO_TTS_MODEL] : []).concat(["gemini-3.1-flash-tts-preview", "gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts"]);
const VOICE = process.env.DEMO_VOICE || "Charon";

const wavHeader = (len, rate) => {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + len, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(len, 40);
  return h;
};
/** duration of a 16-bit mono WAV, from its data chunk */
function wavSeconds(buf) {
  const rate = buf.readUInt32LE(24);
  let i = 12;
  while (i < buf.length - 8) {
    const id = buf.toString("ascii", i, i + 4), size = buf.readUInt32LE(i + 4);
    if (id === "data") return size / (rate * 2);
    i += 8 + size;
  }
  throw new Error("no data chunk");
}

/** Offline Windows voice (DEMO_TTS=sapi): for dry runs when the cloud voice quota is used up. */
function sapi(text) {
  const tmp = `${OUT}/_sapi.wav`;
  const ps = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    `$s.SelectVoice('${process.env.DEMO_SAPI_VOICE || "Microsoft Zira Desktop"}')`,
    "$f = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)",
    "$s.SetOutputToWaveFile($env:SAPI_OUT, $f)",
    "$s.Speak($env:SAPI_TEXT)",
    "$s.Dispose()",
  ].join("; ");
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], { env: { ...process.env, SAPI_TEXT: text, SAPI_OUT: tmp } });
  if (r.status !== 0) throw new Error(`sapi failed: ${r.stderr}`);
  return { wav: readFileSync(tmp), model: "windows-sapi" };
}

async function synth(text) {
  if (process.env.DEMO_TTS === "sapi") return sapi(text);
  let last;
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        // only the narration itself: style instructions placed here get read aloud
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
    });
    const j = await r.json();
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) { last = `${model}: ${r.status} ${j.error?.message?.slice(0, 120)}`; continue; }
    const data = Buffer.from(part.inlineData.data, "base64");
    if (/wav/i.test(part.inlineData.mimeType)) return { wav: data, model };
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000);
    return { wav: Buffer.concat([wavHeader(data.length, rate), data]), model };
  }
  throw new Error(`all TTS models failed: ${last}`);
}

const manifestFile = `${OUT}/manifest.json`;
const old = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};
const manifest = {};
for (const s of buildSegments()) {
  const hash = createHash("sha1").update((process.env.DEMO_TTS || "gemini") + VOICE + s.text).digest("hex").slice(0, 12);
  const file = `${OUT}/${s.id}.wav`;
  if (old[s.id]?.hash === hash && existsSync(file)) {
    manifest[s.id] = old[s.id];
  } else {
    const { wav, model } = await synth(s.text);
    writeFileSync(file, wav);
    manifest[s.id] = { hash, text: s.text, seconds: wavSeconds(wav), model };
  }
  console.log(`${s.id} ${manifest[s.id].seconds.toFixed(1)}s ${manifest[s.id].model}`);
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
}
const total = Object.values(manifest).reduce((a, m) => a + m.seconds, 0);
console.log(`total narration ${total.toFixed(1)}s`);
