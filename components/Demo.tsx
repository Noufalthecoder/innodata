"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Reveal, SectionHead } from "./Section";

type Scene = {
  id: string;
  image: string;
  tier: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  visibility: { object: string; visible: number; ok: boolean }[];
};

export default function Demo() {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/demo/scenes.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setScenes)
      .catch(() => setFailed(true));
  }, []);

  const restart = () => {
    setI(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  const choose = (k: number) => {
    if (picked !== null || !scenes) return;
    setPicked(k);
    if (k === scenes[i].answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (!scenes) return;
    if (i + 1 >= scenes.length) setDone(true);
    else {
      setI(i + 1);
      setPicked(null);
    }
  };

  const s = scenes?.[i];

  return (
    <section id="demo" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead
        eyebrow="Try it yourself"
        title="Answer what the models are asked"
        sub="Each scene below is generated from known object positions. Pick an answer, then see the ground truth and how it was computed."
      />
      <Reveal>
        {failed && <p className="text-zinc-400">The demo scenes could not be loaded.</p>}
        {!scenes && !failed && <p className="text-zinc-500">Loading scenes…</p>}

        {scenes && s && !done && (
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <Image src={s.image} alt={`Scene ${s.id}: ${s.question}`} width={960} height={720} priority={i === 0} className="h-auto w-full" />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                <span>
                  Scene {i + 1} of {scenes.length}
                </span>
                <span>
                  Score {score}/{i + (picked !== null ? 1 : 0)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-accent">{s.tier}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{s.question}</h3>

              <div className="mt-6 space-y-3" role="group" aria-label="Answer options">
                {s.options.map((o, k) => {
                  const revealed = picked !== null;
                  const correct = k === s.answer;
                  const state = !revealed
                    ? "border-white/15 text-zinc-200 hover:border-white/50"
                    : correct
                      ? "border-emerald-400/70 bg-emerald-400/10 text-white"
                      : k === picked
                        ? "border-red-400/70 bg-red-400/10 text-white"
                        : "border-white/10 text-zinc-500";
                  return (
                    <button
                      key={o}
                      onClick={() => choose(k)}
                      disabled={revealed}
                      className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${state}`}
                    >
                      <span>{o}</span>
                      {revealed && correct && <span className="text-sm text-emerald-300">Correct</span>}
                      {revealed && !correct && k === picked && <span className="text-sm text-red-300">Your answer</span>}
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="font-medium text-white">{picked === s.answer ? "You got it." : "Not quite."}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.explanation}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">Visibility check</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-zinc-400">
                    {s.visibility.map((v) => (
                      <li key={v.object}>
                        {v.ok ? "Pass" : "Fail"} · {v.object}, {v.visible}% visible
                      </li>
                    ))}
                  </ul>
                  <button onClick={next} className="mt-6 rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90">
                    {i + 1 >= scenes.length ? "See my score" : "Next scene"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {scenes && done && (
          <div className="rounded-lg border border-white/10 p-10 text-center">
            <p className="text-5xl font-semibold text-white">
              {score}/{scenes.length}
            </p>
            <p className="mt-3 text-zinc-400">Every one of these answers was computed from the scene data, never judged by a person or a model.</p>
            <button onClick={restart} className="mt-6 rounded-md border border-white/25 px-6 py-3 font-medium text-white transition-colors hover:border-white/60">
              Play again
            </button>
          </div>
        )}
      </Reveal>
    </section>
  );
}
